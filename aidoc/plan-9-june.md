# Owner App — Backend Task Cards
**Project:** Serious Punch Coding — JSD12
**Owner:** AJ (Thanachot)
**Created:** June 9, 2026
**Repo:** /Users/aj/jsd12/sp-spin3-backend

---

## HOW TO USE THIS FILE WITH GEMINI

### The rule — one card at a time

Never ask Gemini to execute all cards at once.
Always do one card, verify, then move to the next.

### Step-by-step process for every card

```
STEP 1 — Create a feature branch first (see branch name in each card)
STEP 2 — Give Gemini the execution prompt
STEP 3 — Gemini reads files and makes changes
STEP 4 — Run the audit prompt to verify files on disk
STEP 5 — Paste audit result back to Claude to confirm
STEP 6 — Claude says OK or flags a problem
STEP 7 — Merge to your main only after Claude confirms
STEP 8 — Your Render auto-deploys from your main
STEP 9 — Only open PR to Korchat after confirmed working on your deployment
```

### Execution prompt — use this to start each card

```
Read the file at:
/Users/aj/jsd12/owner-app-task-cards-BE.md

Find BE-CARD-XX and execute only the Gemini Prompt inside that card.
Read every file mentioned before making any changes.
Write all changes to disk.
After finishing, show me the full content of every file you changed
so I can verify.
Do not move to any other card.
```

### Audit prompt — run this after every card

```
Audit the files that were just changed in BE-CARD-XX.
For each file that should have been edited or created,
read the actual file from disk and show me the full content.
Do not show me what you think you wrote — read the actual file.
```

### Execution order — do not skip ahead

BE-01 → BE-02 → BE-03 → BE-04 → BE-05 → BE-06

FE cards can only start after BE cards are confirmed working on Render.

---

## BE-CARD-01 — Add SSE Stream to Orders Route

### Explanation
`/api/orders/stream` does not exist. The menu route already has a working SSE
handler using `sseHandler` from `src/utils/sse.js`. We just need to register the
same handler on the orders route. This unblocks CARD-06 and CARD-09 on the FE.

### Branch
```
git checkout main
git checkout -b feature/be-sse-orders
```

### Goal
- `GET /api/orders/stream` returns SSE headers and keeps connection open
- Frontend EventSource can connect to it without error
- Uses the same sseHandler pattern as menus

### Gemini Prompt
```
I need to add an SSE stream endpoint to the orders route.
All paths under /Users/aj/jsd12/sp-spin3-backend/

Read these files first:
1. src/routes/menu.js — see how sseHandler is used there
2. src/routes/order.js — see current order routes
3. src/utils/sse.js — understand the sseHandler implementation
4. src/routes/index.js — confirm route registration

Then make this change:

--- CHANGE: src/routes/order.js ---
1. Import sseHandler at the top of the file:
   import { sseHandler } from '../utils/sse.js'
   (match the import style already used in the file)

2. Add this route BEFORE any routes with :id params to avoid conflicts:
   router.get('/stream', sseHandler)

Do not change anything else in the file.
Show me the full updated src/routes/order.js after the change.
```

---

## BE-CARD-02 — Add SSE Stream to Ingredients Route

### Explanation
`/api/ingredients/stream` does not exist. Same fix as BE-CARD-01 but for the
ingredients route. This unblocks CARD-05 on the FE.

### Branch
```
git checkout main
git checkout -b feature/be-sse-ingredients
```

### Goal
- `GET /api/ingredients/stream` returns SSE headers and keeps connection open
- Frontend EventSource can connect to it without error

### Gemini Prompt
```
I need to add an SSE stream endpoint to the ingredients route.
All paths under /Users/aj/jsd12/sp-spin3-backend/

Read these files first:
1. src/routes/menu.js — see how sseHandler is used there
2. src/routes/ingredient.js — see current ingredient routes
3. src/utils/sse.js — understand the sseHandler implementation

Then make this change:

--- CHANGE: src/routes/ingredient.js ---
1. Import sseHandler at the top of the file:
   import { sseHandler } from '../utils/sse.js'
   (match the import style already used in the file)

2. Add this route BEFORE any routes with :id params to avoid conflicts:
   router.get('/stream', sseHandler)

Do not change anything else in the file.
Show me the full updated src/routes/ingredient.js after the change.
```

---

## BE-CARD-03 — Add SSE Stream to Tables Route

### Explanation
`/api/tables/stream` does not exist. Tables currently uses Socket.io via
`tableOrderSocket.js` for real-time updates. We are adding SSE as well so the
owner app can use the same consistent pattern as all other pages.

### Branch
```
git checkout main
git checkout -b feature/be-sse-tables
```

### Goal
- `GET /api/tables/stream` returns SSE headers and keeps connection open
- Frontend EventSource can connect to it without error
- Socket.io for tables remains untouched

### Gemini Prompt
```
I need to add an SSE stream endpoint to the tables route.
All paths under /Users/aj/jsd12/sp-spin3-backend/

Read these files first:
1. src/routes/menu.js — see how sseHandler is used there
2. src/routes/table.js — see current table routes
3. src/utils/sse.js — understand the sseHandler implementation

Then make this change:

--- CHANGE: src/routes/table.js ---
1. Import sseHandler at the top of the file:
   import { sseHandler } from '../utils/sse.js'
   (match the import style already used in the file)

2. Add this route BEFORE any routes with :id params to avoid conflicts:
   router.get('/stream', sseHandler)

Do not change anything else in the file.
Do not touch tableOrderSocket.js or any Socket.io code.
Show me the full updated src/routes/table.js after the change.
```

---

## BE-CARD-04 — Add on_duty Field to User Model

### Explanation
The owner app needs to reassign riders to delivery orders. To show only riders
who are currently working, we add an `on_duty` Boolean field to the User model.
Riders will toggle this in the Rider app (separate team PR). For now the owner
app shows all riders with role: rider AND active_status: true, with their
on_duty status visible. The filter will become stricter once Rider app has the toggle.

### Branch
```
git checkout main
git checkout -b feature/be-user-on-duty
```

### Goal
- User model has `on_duty` field (Boolean, default false)
- `GET /api/owner/staff` response includes `on_duty` for each user
- Existing users are not broken — field defaults to false

### Gemini Prompt
```
I need to add an on_duty field to the User model.
All paths under /Users/aj/jsd12/sp-spin3-backend/

Read these files first:
1. src/modules/users/User.js — see current User schema
2. src/modules/users/userController.js — see how users are returned
3. src/routes/index.js — confirm owner staff route registration

Then make these changes:

--- CHANGE 1: src/modules/users/User.js ---
Find the schema definition and add this field:
on_duty: { type: Boolean, default: false }

Add it after the active_status field.
Do not change anything else in the schema.

--- CHANGE 2: Confirm src/modules/users/userController.js ---
Find the function that handles GET /api/owner/staff.
Make sure on_duty is NOT excluded from the response.
If there is a select() or projection that lists specific fields,
add on_duty to that list.
If there is no projection, do nothing — it will be included automatically.

Show me the full updated User.js and the relevant section of userController.js.
```

---

## BE-CARD-05 — Add Settings Module (Booking Config)

### Explanation
Reservation minimum order amounts are hardcoded in the customer app frontend.
We need to move them to MongoDB so the owner can adjust them from the owner app.
This creates a Settings collection with a generic key/value structure that can
store any config in future.

Backend validation is also added so even if someone bypasses the frontend,
the server rejects orders that do not meet the minimum.

### Branch
```
git checkout main
git checkout -b feature/be-settings-booking
```

### Goal
- `GET /api/config/booking` returns current thresholds (public, no auth)
- `PATCH /api/config/booking` updates thresholds (owner only)
- `POST /api/orders` validates reservation subTotal against thresholds
- Default values (600, 1200, 2500) used if no settings document exists

### Gemini Prompt
```
I need to add a Settings module to the backend.
All paths under /Users/aj/jsd12/sp-spin3-backend/

Read these files first to understand existing patterns:
1. src/modules/menus/Menu.js — for Mongoose model pattern
2. src/routes/index.js — to know where to register new route
3. src/middleware/auth.js — for isAuth and isEligible usage
4. src/modules/orders/orderController.js — to add validation logic

Then make these changes:

--- CHANGE 1: Create src/modules/settings/Settings.js ---
const mongoose = require('mongoose')

const settingsSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true },
}, { timestamps: true })

module.exports = mongoose.model('Settings', settingsSchema)

--- CHANGE 2: Create src/modules/settings/settingsController.js ---
Create 2 exported async functions:

getBookingConfig(req, res):
  Try to find document with key 'reservationThresholds' in Settings
  If not found return res.json({ oneTwoMin: 600, threeSixMin: 1200, sevenTenMin: 2500 })
  If found return res.json(doc.value)
  Catch errors with res.status(500)

updateBookingConfig(req, res):
  Use Settings.findOneAndUpdate(
    { key: 'reservationThresholds' },
    { value: req.body },
    { upsert: true, new: true }
  )
  Return res.json(updated.value)
  Catch errors with res.status(500)

--- CHANGE 3: Create src/routes/settings.js ---
const express = require('express')
const router = express.Router()
const { isAuth, isEligible } = require('../middleware/auth')
const { getBookingConfig, updateBookingConfig } =
  require('../modules/settings/settingsController')

router.get('/booking', getBookingConfig)
router.patch('/booking', isAuth, isEligible('owner'), updateBookingConfig)

module.exports = router

--- CHANGE 4: Update src/routes/index.js ---
Add this line with the other route registrations:
router.use('/config', require('./settings'))

--- CHANGE 5: Update orderController.js ---
In the create order function, before saving the order:
1. Check if reservationPax exists in the request body
2. If it is a reservation:
   a. Import Settings model at the top of the file if not already imported
   b. const configDoc = await Settings.findOne({ key: 'reservationThresholds' })
   c. const config = configDoc?.value || { oneTwoMin: 600, threeSixMin: 1200, sevenTenMin: 2500 }
   d. Get pax from req.body.reservationPax
   e. Get subTotal from req.body.subTotal or calculate from orderList
   f. If pax <= 2 and subTotal < config.oneTwoMin:
      return res.status(400).json({ message: 'Order total does not meet minimum for 1-2 people' })
   g. If pax <= 6 and subTotal < config.threeSixMin:
      return res.status(400).json({ message: 'Order total does not meet minimum for 3-6 people' })
   h. If pax <= 10 and subTotal < config.sevenTenMin:
      return res.status(400).json({ message: 'Order total does not meet minimum for 7-10 people' })

Show me all created and updated files after the changes.
```

---

## BE-CARD-06 — Extend Owner Summary Route for Date Range

### Explanation
The Dashboard currently only supports today/week/month period filter.
We need to extend `GET /api/owner/summary` to also accept `startDate` and
`endDate` query params so the owner can view historical data up to 6 months back.

### Branch
```
git checkout main
git checkout -b feature/be-summary-daterange
```

### Goal
- `GET /api/owner/summary?period=week` still works as before
- `GET /api/owner/summary?startDate=2026-01-01&endDate=2026-03-31` works
- When startDate and endDate are provided, period param is ignored
- All summary calculations (revenue, orders, AOV, active tables) use the date filter

### Gemini Prompt
```
I need to extend the owner summary endpoint to accept date range params.
All paths under /Users/aj/jsd12/sp-spin3-backend/

Read this file first:
src/modules/orders/orderController.js

Find the function that handles GET /api/owner/summary.
Read the entire function carefully before making any changes.

Then make this change:

--- CHANGE: orderController.js summary function ---
At the start of the summary function, before the existing period logic, add:

const { period, startDate, endDate } = req.query

let dateFilter = {}

if (startDate && endDate) {
  const start = new Date(startDate)
  start.setHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  dateFilter = { createdAt: { $gte: start, $lte: end } }
} else {
  // keep the existing period logic here exactly as it was
  // just wrap it so it sets dateFilter instead of its own variable
}

Then replace every place in the function that uses the old date variable
with dateFilter instead.

Do not change the response structure.
Do not change any other function in the file.
Show me the full updated summary function after the change.
```

---

## Summary Table

| Card | Title | Effort | Blocks FE card |
|---|---|---|---|
| BE-CARD-01 | SSE stream for orders | 15 min | FE-06, FE-09 |
| BE-CARD-02 | SSE stream for ingredients | 15 min | FE-05 |
| BE-CARD-03 | SSE stream for tables | 15 min | FE-07 |
| BE-CARD-04 | on_duty field for riders | 30 min | FE-08 |
| BE-CARD-05 | Settings module booking config | 1 hr | FE-11 |
| BE-CARD-06 | Summary date range filter | 30 min | FE-09 |

**Execute in order:** BE-01 → BE-02 → BE-03 → BE-04 → BE-05 → BE-06

After all BE cards confirmed on your Render deployment,
start the FE cards using owner-app-task-cards-FE.md