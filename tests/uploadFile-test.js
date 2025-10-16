import fs from "fs";

// อ่านไฟล์เป็น Buffer
const fileBuffer = fs.readFileSync("/home/nicasio/Desktop/RuamLem/exam/2559-1/010123105_2559-1.pdf");

// แปลง Buffer เป็น Uint8Array
const file = new File([new Uint8Array(fileBuffer)], "010123105_2559-1.pdf", { type: "application/pdf" });

// สร้าง FormData
const formData = new FormData();
formData.append("file", file);
formData.append("post_id", "abc123");

// // ส่ง fetch
const res = await fetch("http://localhost:3030/upload/file", {
  method: "POST",
  headers: {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI4NWQ4MDUxYi05M2FiLTQ1ZDUtOTI0Mi1kM2Y5YzQ0MTg3ZWEiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzU4MjcyMjU3LCJpYXQiOjE3NTgyNjg2NTcsImVtYWlsIjoic2VybWNoYXJ0LmZyYW5rQGdtYWlsLmNvbSIsInBob25lIjoiIiwiYXBwX21ldGFkYXRhIjp7InByb3ZpZGVyIjoiZW1haWwiLCJwcm92aWRlcnMiOlsiZW1haWwiXX0sInVzZXJfbWV0YWRhdGEiOnsiZW1haWwiOiJzZXJtY2hhcnQuZnJhbmtAZ21haWwuY29tIiwiZW1haWxfdmVyaWZpZWQiOnRydWUsInBob25lX3ZlcmlmaWVkIjpmYWxzZSwic3ViIjoiODVkODA1MWItOTNhYi00NWQ1LTkyNDItZDNmOWM0NDE4N2VhIn0sInJvbGUiOiJhdXRoZW50aWNhdGVkIiwiYWFsIjoiYWFsMSIsImFtciI6W3sibWV0aG9kIjoicGFzc3dvcmQiLCJ0aW1lc3RhbXAiOjE3NTgyNjg2NTd9XSwic2Vzc2lvbl9pZCI6IjkwYWE0OGY0LWVjYTItNDk5Yy05YmVjLWQxY2E2NTRjOGNlZSIsImlzX2Fub255bW91cyI6ZmFsc2V9.ICZj_pDTwNTeuVd8zYn3MBXaO3itlL3MfpfPjvODCQM", // ใส่ token จริง
  },
  body: formData,
});

console.log(res);

// ตรวจสอบ content-type ก่อน parse
// const contentType = res.headers.get("content-type") || "";
// let data;
// if (contentType.includes("application/json")) {
//   data = await res.json();
// } else {
//   data = await res.text();
// }

// console.log(formData);
