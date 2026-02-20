# TV Complete Details API Documentation

## API Endpoint
```
GET /api/tvs/complete/:tvCode
```

## Description
यह API किसी भी TV ID से उस TV का complete data निकालती है, जिसमें सारी analytics, statistics, और performance metrics शामिल हैं।

## Request Example
```
GET /api/tvs/complete/17
```

## Response Structure

### 1. TV Basic Information (`tvInfo`)
```json
{
  "tvId": "17",
  "tvName": "TV 17", 
  "status": "offline|online|maintenance",
  "isActive": true,
  "lastSyncTime": "2026-02-20T04:05:00Z",
  "createdAt": "2026-02-16T10:09:49.267Z",
  "updatedAt": "2026-02-16T14:27:47.004Z",
  "ageInDays": 4,
  "ageInHours": 96,
  "timeSinceLastSync": "30 minutes ago"
}
```

**Fields Explanation:**
- `ageInDays`: TV कितने दिन पुराना है
- `ageInHours`: TV कितने घंटे पुराना है  
- `timeSinceLastSync`: Last sync से कितना समय हुआ है

### 2. Location Details (`location`)
```json
{
  "store": {"name": "Big Bazaar Andheri"},
  "zone": {"name": "Andheri West"},
  "city": {"name": "Mumbai"},
  "state": {"name": "Maharashtra"},
  "country": {"name": "India"},
  "coordinates": [72.8777, 19.0760],
  "address": "Shop No. 123, Andheri West",
  "floor": "Ground Floor"
}
```

### 3. Hardware Details (`hardware`)
```json
{
  "screenSize": "55 inch",
  "resolution": "4K",
  "manufacturer": "Samsung",
  "model": "QN55Q60T",
  "serialNumber": "SN123456789",
  "macAddress": "AA:BB:CC:DD:EE:01",
  "ipAddress": "192.168.1.100",
  "firmwareVersion": "1.2.3"
}
```

### 4. Current Status (`currentStatus`)
```json
{
  "currentTime": "14:30",
  "isPlaying": true,
  "currentlyPlaying": {
    "ad": {
      "title": "Coca Cola Ad",
      "duration": 30
    },
    "scheduledTime": "14:30",
    "playTimes": ["14:30", "16:00", "18:30"]
  }
}
```

**Fields Explanation:**
- `currentTime`: Current time (India timezone)
- `isPlaying`: क्या अभी कोई ad play हो रहा है
- `currentlyPlaying`: अभी कौन सा ad play हो रहा है

### 5. Today's Schedule (`todaySchedule`)
```json
{
  "date": "2026-02-20",
  "totalAds": 3,
  "totalScheduledPlays": 25,
  "schedules": [
    {
      "ad": {
        "title": "Coca Cola Ad",
        "duration": 30
      },
      "playTimes": ["09:00", "12:00", "18:00"],
      "validFrom": "2026-02-20T00:00:00Z",
      "validTo": "2026-02-20T23:59:59Z"
    }
  ]
}
```

**Fields Explanation:**
- `totalScheduledPlays`: आज कुल कितनी बार ads play होंगे

### 6. Complete Analytics (`analytics`)
```json
{
  "totalPlaysCount": 150,
  "uniqueAdsPlayed": 5,
  "totalPlayedDuration": {
    "seconds": 4983,
    "formatted": "1h 23m 3s"
  },
  "averagePlaysPerDay": 37,
  "mostPlayedAd": {
    "adId": "17",
    "playCount": 45
  },
  "adPlayCounts": {
    "17": 45,
    "18": 35,
    "19": 25
  },
  "dailyStats": [
    {
      "date": "2026-02-20",
      "playsCount": 25,
      "totalDuration": 830,
      "formattedDuration": "13m 50s"
    }
  ]
}
```

**Fields Explanation:**
- `totalPlaysCount`: कुल कितनी बार ads play हुए हैं
- `uniqueAdsPlayed`: कितने unique ads play हुए हैं
- `totalPlayedDuration`: कुल कितनी देर ads play हुए हैं
- `averagePlaysPerDay`: Average daily plays
- `mostPlayedAd`: सबसे ज्यादा play होने वाला ad
- `adPlayCounts`: हर ad कितनी बार play हुआ है
- `dailyStats`: Daily wise statistics (last 30 days)

### 7. Performance Metrics (`performance`)
```json
{
  "uptimePercentage": "95%",
  "lastOnlineTime": "2026-02-20T04:05:00Z",
  "totalActiveDays": 4,
  "averageUptimePerDay": "22.8 hours"
}
```

**Fields Explanation:**
- `uptimePercentage`: TV कितना % time online रहा है
- `totalActiveDays`: कुल कितने दिन active है
- `averageUptimePerDay`: Average daily uptime

### 8. Recent Logs (`recentLogs`)
```json
{
  "total": 150,
  "logs": [
    {
      "ad": {
        "title": "Coca Cola Ad",
        "adId": "17",
        "duration": 30
      },
      "playedAt": "2026-02-20T03:55:00Z"
    }
  ]
}
```

## Key Features

### ✅ TV Age & History
- TV कब बना था
- कितने दिन/घंटे पुराना है
- Last sync time

### ✅ Complete Analytics
- Total plays count
- Unique ads played
- Total played duration
- Daily statistics (30 days)
- Most played ad
- Ad-wise play counts

### ✅ Real-time Status
- Current playing ad
- Online/offline status
- Current time (India timezone)

### ✅ Performance Metrics
- Uptime percentage
- Average daily usage
- Total active days

### ✅ Location & Hardware
- Complete location hierarchy
- Hardware specifications
- Network details

## Usage Examples

### Frontend में Use करने के लिए:
```javascript
// API call
const response = await fetch('/api/tvs/complete/17');
const data = await response.json();

// TV age display
console.log(`TV Age: ${data.data.tvInfo.ageInDays} days`);

// Analytics display
console.log(`Total Plays: ${data.data.analytics.totalPlaysCount}`);
console.log(`Total Duration: ${data.data.analytics.totalPlayedDuration.formatted}`);

// Current status
if (data.data.currentStatus.isPlaying) {
  console.log(`Currently Playing: ${data.data.currentStatus.currentlyPlaying.ad.title}`);
}
```

### Dashboard के लिए Key Metrics:
1. **TV Status**: `data.tvInfo.status`
2. **Current Ad**: `data.currentStatus.currentlyPlaying`
3. **Today's Schedule**: `data.todaySchedule.totalScheduledPlays`
4. **Total Plays**: `data.analytics.totalPlaysCount`
5. **Most Popular Ad**: `data.analytics.mostPlayedAd`
6. **Daily Stats**: `data.analytics.dailyStats`

## Error Responses

### TV Not Found
```json
{
  "success": false,
  "message": "TV not found with this tvCode"
}
```

### Server Error
```json
{
  "success": false,
  "message": "Server error",
  "error": "Error details"
}
```

## Notes
- सभी times India timezone (Asia/Kolkata) में हैं
- Daily stats last 30 days तक show होते हैं
- Recent logs last 20 entries show होते हैं
- AdLog model optional है - अगर नहीं है तो empty array return होगा