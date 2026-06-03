import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from './User.js';

const serializeUser = (user, includeTimestamps = false) => {
  const payload = {
    id: user._id,
    name: user.name,
    surname: user.surname,
    username: user.username,
    email: user.email,
    phone: user.phone || '',
    role: user.role,
    addresses: Array.isArray(user.addresses) ? user.addresses : [],
    active_status: user.active_status,
  };

  if (includeTimestamps) {
    payload.createdAt = user.createdAt;
    payload.updatedAt = user.updatedAt;
  }

  return payload;
};

const normalizeAddresses = (addresses = [], user) => {
  if (!Array.isArray(addresses)) return undefined;

  const normalized = addresses
    .slice(0, 10)
    .map((address) => ({
      _id: address._id,
      addressName: String(address.addressName || address.name || address.tag || 'Home').trim(),
      tag: ['Home', 'Work', 'Other'].includes(address.tag) ? address.tag : 'Other',
      username: String(address.username || user.username || '').trim(),
      phone: String(address.phone || user.phone || '').trim(),
      address: String(address.address || address.detail || '').trim(),
      isDefault: address.isDefault === true,
    }))
    .filter((address) => address.address);

  if (normalized.length > 0 && !normalized.some((address) => address.isDefault)) {
    normalized[0].isDefault = true;
  }

  let defaultFound = false;
  return normalized.map((address) => {
    if (address.isDefault && !defaultFound) {
      defaultFound = true;
      return address;
    }

    return { ...address, isDefault: false };
  });
};

export const register = async (req, res) => {
  try {
    const { name, surname, username, email, password, phone, address, addressName } = req.body;

    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ message: 'Phone number is required' });
    }

    if (!address || !String(address).trim()) {
      return res.status(400).json({ message: 'Address is required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ $or: [{ email }, { username }] });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      surname,
      username,
      email,
      password: hashedPassword,
      phone: String(phone).trim(),
      addresses: [{
        addressName: String(addressName || 'Home').trim(),
        tag: 'Home',
        username: username,
        phone: String(phone).trim(),
        address: String(address).trim(),
        isDefault: true,
      }],
      role: 'customer'
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: serializeUser(user)
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
    );

    res.json({
      token,
      user: serializeUser(user),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(serializeUser(user, true));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMe = async (req, res) => {
  try {
    const { name, surname, username, email, phone, addresses } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email, _id: { $ne: user._id } });
      if (existingEmail) return res.status(400).json({ message: 'Email is already in use' });
      user.email = email;
    }

    if (username && username !== user.username) {
      const existingUsername = await User.findOne({ username, _id: { $ne: user._id } });
      if (existingUsername) return res.status(400).json({ message: 'Username is already in use' });
      user.username = username;
    }

    if (name) user.name = name;
    if (surname) user.surname = surname;
    if (phone !== undefined) user.phone = String(phone || '').trim();

    const normalizedAddresses = normalizeAddresses(addresses, user);
    if (normalizedAddresses) user.addresses = normalizedAddresses;

    await user.save();

    res.json(serializeUser(user));
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Current password is incorrect' });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
