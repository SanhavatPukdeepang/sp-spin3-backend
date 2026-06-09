import { Order } from '../orders/Order.js';
import {
  buildIngredientRequirements,
  calculateOrderTotal,
  isFutureReservationOrder,
  isReservationOrder,
  validateIngredientRequirements,
} from '../orders/orderController.js';
import { broadcastTableOrderUpdate } from '../../realtime/tableOrderSocket.js';

const isStaffPaymentUser = (user) => ['owner', 'cashier'].includes(user?.role);
const isOrderOwner = (order, user) => String(order.customer?.userId || '') === String(user?.id || '');

const formatMoney = (value) =>
  Number(value || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const appendStaffNoteLine = (order, line) => {
  const note = String(order.note_global || '').trim();
  order.note_global = note ? `${note}\n${line}` : line;
};

const addRefundDifferenceNote = (order, paidAmount, currentTotal, reason = '') => {
  const refundAmount = Math.round(Math.max(0, Number(paidAmount || 0) - Number(currentTotal || 0)) * 100) / 100;
  if (refundAmount <= 0) return;

  appendStaffNoteLine(
    order,
    [
      `Refund required: paid ${formatMoney(paidAmount)} - current total ${formatMoney(currentTotal)} = return ${formatMoney(refundAmount)} baht.`,
      reason ? `Reason: ${reason}` : '',
    ].filter(Boolean).join(' '),
  );
};

const attachPaymentToOrder = (order, { paymentMethod, amount, transactionId, slipUrl }) => {
  order.payment = {
    method: paymentMethod,
    amount,
    transactionId,
    ...(slipUrl ? { slipUrl } : {}),
    paidAt: new Date(),
  };

  if (slipUrl) {
    order.evidenceImage = slipUrl;
    order.receiptUrl = slipUrl;
  }
};

export const processPayment = async (req, res) => {
  try {
    const orderId = req.params.orderId || req.body.orderId;
    const { paymentMethod, amount } = req.body;

    if (!orderId) return res.status(400).json({ message: 'Missing orderId' });
    if (!paymentMethod) return res.status(400).json({ message: 'Missing paymentMethod' });
    
    // When slip is uploaded, amount might come as string from FormData
    const numericAmount = Number(amount);
    if (numericAmount == null || isNaN(numericAmount) || numericAmount <= 0) return res.status(400).json({ message: 'Invalid amount' });

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!isStaffPaymentUser(req.user) && !isOrderOwner(order, req.user)) {
      return res.status(403).json({ message: 'Access denied' });
    }
    if (order.payment?.paidAt) return res.status(400).json({ message: 'Order already paid' });
    if (['completed', 'delivered', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ message: `Cannot pay an order with status ${order.status}` });
    }

    const expectedAmount = calculateOrderTotal(order);
    if (numericAmount + 0.01 < expectedAmount) {
      return res.status(400).json({
        message: 'Payment amount is less than order total',
        expectedAmount,
      });
    }

    const slipUrl = req.file?.path || '';
    const paymentResult = { success: true, transactionId: `txn_${Date.now()}` };

    if (!order.inventoryDeductedAt && !isFutureReservationOrder(order)) {
      const requirements = await buildIngredientRequirements(order.orderList);
      const stockError = validateIngredientRequirements(requirements);
      if (stockError) {
        if (slipUrl) {
          attachPaymentToOrder(order, {
            paymentMethod,
            amount: numericAmount,
            transactionId: paymentResult.transactionId,
            slipUrl,
          });
          appendStaffNoteLine(
            order,
            `Stock/change required after slip upload: ${stockError}. Keep this slip; do not ask customer to upload a new picture. If items are removed, return the subtraction difference to the customer.`,
          );
          await order.save();
          await broadcastTableOrderUpdate();

          return res.status(409).json({
            message: `Payment slip was saved, but the order needs staff review because ${stockError}.`,
            reason: stockError,
            orderId: order._id,
            slipSaved: true,
            evidenceImage: order.evidenceImage,
            slipUrl: order.payment?.slipUrl || '',
          });
        }

        return res.status(409).json({
          message: `Cannot process payment because ${stockError}.`,
          reason: stockError,
        });
      }
    }

    if (!paymentResult.success) {
      return res.status(402).json({ message: 'Payment failed' });
    }

    order.status = 'pending';
    attachPaymentToOrder(order, {
      paymentMethod,
      amount: numericAmount,
      transactionId: paymentResult.transactionId,
      slipUrl,
    });
    addRefundDifferenceNote(order, numericAmount, expectedAmount, 'Payment amount is higher than current order total.');

    await order.save();
    await broadcastTableOrderUpdate();

    res.json({
      success: true,
      message: 'Payment processed successfully',
      orderId: order._id,
      status: order.status,
      transactionId: paymentResult.transactionId,
      evidenceImage: order.evidenceImage,
      slipUrl: order.payment?.slipUrl || ''
    });
  } catch (err) {
    console.error('processPayment error', err);
    res.status(500).json({ message: err.message });
  }
};
