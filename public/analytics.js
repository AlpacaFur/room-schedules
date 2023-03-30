// This just increments a visitor counter, no other data is recorded.
fetch("/analytics/increment_user", {
  "method": "POST",
  "body": "main"
})
