import "./register.scss";
import { Link } from "react-router-dom";
import { useState } from "react";
import apiRequest from "../../lib/apiRequest";

function Register() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsLoading(true);

    const formData = new FormData(e.target);

    const username = formData.get("username");
    const email = formData.get("email");
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    // Validate passwords match
    if (password !== confirmPassword) {
      setError("Passwords do not match!");
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (password.length < 8) {
      setError("Password must be at least 8 characters long!");
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest.post("/auth/register", {
        username,
        email,
        password,
      });
      setSuccess(
        res.data?.message ||
          "Registration successful. Check your email for your magic link."
      );
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to create user!");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="registerPage">
      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <h1>Create an Account</h1>
          <input
            name="username"
            type="text"
            placeholder="Username"
            required
          />
          <input
            name="email"
            type="email"
            placeholder="Email"
            required
          />
          <input
            name="password"
            type="password"
            placeholder="Password"
            required
            minLength={8}
          />
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            required
            minLength={8}
          />
          <button disabled={isLoading}>Register</button>
          {error && <span>{error}</span>}
          {success && <span>{success}</span>}
          <Link to="/">Back to Home</Link>
        </form>
      </div>
      <div className="imgContainer">
        <img src="/bg.png" alt="" />
      </div>
    </div>
  );
}

export default Register;
