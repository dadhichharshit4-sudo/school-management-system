async function registerStudent() {
  try {
    const res = await fetch("http://localhost:5000/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Rahul Sharma",
        email: "rahul@school.com",
        password: "rahul123",
        role: "student"
      })
    });
    const data = await res.json();
    console.log("छात्र रजिस्ट्रेशन परिणाम:", data);
  } catch (err) {
    console.error("एरर:", err.message);
  }
}

registerStudent();