# Kestrel User Guide / 用户使用指南

**Kestrel** alerts you the moment a campsite opens up — no more refreshing reservation pages.

**Kestrel** 在营地有空位的第一时间通知你，告别手动刷页面。

---

## Getting Started / 开始使用

### 1. Create an account / 注册账号

Click **Get started** in the top navigation bar. Enter your email and a password.

点击顶部导航栏的 **Get started**，输入邮箱和密码完成注册。

---

### 2. Find a campground / 搜索营地

Go to **Search**. Type a campground or park name (e.g. "Yosemite", "Upper Pines", "Henry Cowell").

点击 **Search**，输入营地或公园名称进行搜索。

- Results appear as a list and on the map
  搜索结果以列表和地图两种形式展示
- Hover a row to see the external booking link
  悬停行可看到官网外链图标
- Click anywhere on a row to open the Watch modal
  点击行任意位置打开提醒设置窗口

---

### 3. Create an alert / 创建提醒

In the Watch modal:

在弹出的 Watch 窗口中：

| Field / 字段 | Description / 说明 |
|---|---|
| Check-in date / 入住日期 | First night you want |
| Check-out date / 退房日期 | Last night you want |
| Minimum nights / 最少夜数 | Skip sites that only have partial openings |
| Site type / 营地类型 | Any / Tent / RV / Cabin |

Click **Create alert**. Kestrel starts scanning immediately.

点击 **Create alert**，Kestrel 立即开始监控。

---

### 4. Check your alerts / 查看提醒

Go to **My Alerts** to see all active watches.

进入 **My Alerts** 查看所有监控中的提醒。

| Status / 状态 | Meaning / 含义 |
|---|---|
| Watching / 监控中 | Scanning every ~2 minutes |
| Available / 有空位 | Site opened — book now! |
| Paused / 已暂停 | Manually paused |
| Expired / 已过期 | Date range has passed |

You can **Pause** or **Delete** any alert at any time. Alerts auto-expire when `date_to` passes.

随时可以**暂停**或**删除**提醒。退房日期过后提醒自动过期，无需手动清理。

---

### 5. Today's Releases / 今日开放预订

Go to **Releasing** to see campgrounds whose booking windows open today.

进入 **Releasing** 查看今天开放预订窗口的营地。

Each row shows:
- Which campsite date becomes bookable today
- The exact drop time (e.g. 4:00 PM ET for Recreation.gov)
- A **Set alert** button to start watching immediately
- Click the row to go directly to the official booking page

每行显示今天起可预订的营地日期、具体开放时间，以及一键跳转官网的链接。

> **Tip**: Set your alert the day before a popular campground opens — Kestrel automatically increases scan frequency to every 30 seconds during the ±30 minutes around drop time.
>
> **提示**：在热门营地开放前一天设置提醒，Kestrel 会在开放时间前后 30 分钟内自动将扫描频率提升至每 30 秒一次。

---

### 6. Notification settings / 通知设置

Click your username in the top nav → **Settings**.

点击顶部导航栏用户名 → **Settings**。

- **Email alerts**: on by default
  **邮件提醒**：默认开启
- **SMS alerts**: toggle on → enter phone number in E.164 format (e.g. `+14155550100`)
  **短信提醒**：开启后输入手机号（E.164 格式，如 `+14155550100`）

Click **Save preferences**.

---

## How fast is it? / 响应速度

| Scenario / 场景 | Scan frequency / 扫描频率 |
|---|---|
| Normal / 平时 | Every ~2 minutes / 约每 2 分钟 |
| During booking drop window / 开放预订时段 | Every ~30 seconds / 约每 30 秒 |

---

## Supported providers / 支持的预订平台

| Provider | Coverage / 覆盖范围 |
|---|---|
| Recreation.gov | ~1,100+ US federal campgrounds / 1100+ 个美国联邦营地 |
| ReserveCalifornia | 115 California state parks / 115 个加州州立公园 |

---

## Tips / 使用技巧

- **Set multiple alerts** for the same campground with different date ranges to improve your chances.
  **对同一营地设置多个不同日期段的提醒**，提高成功率。

- **Use "Minimum nights"** so you're only notified when enough consecutive nights are open.
  **使用"最少夜数"**，只在有足够连续空位时才收到通知。

- **Watch the Releasing page** the day before a popular campground opens.
  **提前关注 Releasing 页面**，在开放前一天就设好提醒。

---

## Admin Panel / 管理后台

Admin users can access `/admin` to view:
- Total users, campgrounds, alerts (active and total)
- Campground breakdown by provider
- Full user list with tier and alert count

Admin access is granted manually — contact the site owner.

管理员可访问 `/admin` 查看用户、营地和提醒的统计数据。管理员权限需由站长手动授予。
