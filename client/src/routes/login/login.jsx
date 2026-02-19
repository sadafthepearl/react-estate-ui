import { Link, useNavigate, useSearchParams } from "react-router-dom";
import "./login.scss";
import { useContext, useEffect, useState } from "react";
import apiRequest from '../../lib/apiRequest';
import { AuthContext } from '../../context/AuthContext';

function Login() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [mode, setMode] = useState("password");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");

  const { updateUser } = useContext(AuthContext);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const requires = searchParams.get("requires2FA");
    const incomingUserId = searchParams.get("userId");
    const magicLinkError = searchParams.get("error");
    const magicSuccess = searchParams.get("magic");
    if (requires === "true" && incomingUserId) {
      setRequires2FA(true);
      setUserId(incomingUserId);
    }

    if (magicLinkError) {
      setError("Magic link is invalid or expired. Request a new one.");
      setMode("magicLink");
    }

    if (magicSuccess === "success") {
      setMessage("Magic link verified. You can continue from here.");
    }
  }, [searchParams]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);
    const formData = new FormData(e.target);

    const username = formData.get("username");
    const password = formData.get("password");

    try {
      const res = await apiRequest.post("/auth/login", {
        username,
        password,
      });

      if (res.data.requires2FA) {
        setRequires2FA(true);
        setUserId(res.data.userId);
        setIsLoading(false);
        return;
      }
      updateUser(res.data);

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid Credentials!");
      console.error("Register error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const res = await apiRequest.post("/auth/verify-login-2fa", {
        userId,
        token: twoFactorToken,
      });

      updateUser(res.data);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "2FA Verification Failed!");
      console.error("2FA Verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestCode = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await apiRequest.post("/auth/login-email", { email });
      setMessage("Code sent. Check your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const res = await apiRequest.post("/auth/verify-email-code", {
        email,
        code: emailCode,
      });
      updateUser(res.data);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid or expired code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMagicLink = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await apiRequest.post("/auth/magic-link", { email });
      setMessage("Magic link sent. Check your email.");
    } catch (err) {
      setError(err.response?.data?.message || "Failed to send magic link.");
    } finally {
      setIsLoading(false);
    }
  };

  if (requires2FA) {

    return (
      <div className="login">
        <div className="formContainer">
          <form onSubmit={handleVerify2FA}>
            <h1>Two-Factor Authentication</h1>
            <p>Enter the 6-digit code from your authenticator app</p>
            <input
              name="token"
              type="text"
              placeholder="000000"
              required
              maxLength={6}
              value={twoFactorToken}
              onChange={(e) => setTwoFactorToken(e.target.value)}
            />
            <button disabled={isLoading}>Verify</button>
            {error && <span className="error">{error}</span>}
            <button
              type="button"
              onClick={() => {
                setRequires2FA(false);
                setTwoFactorToken("");
              }}
              className="backButton"
            >
              Back to Login
            </button>
          </form>
        </div>
        <div className="imgContainer">
          <img src="/bg.png" alt="" />
        </div>
      </div>
    );
  }

  return (
    <div className="login">
      <div className="formContainer">
        <h1>Welcome Back</h1>

        <div className="authModeTabs">
          <button
            type="button"
            className={mode === "password" ? "active" : ""}
            onClick={() => setMode("password")}
          >
            Password
          </button>
          <button
            type="button"
            className={mode === "emailCode" ? "active" : ""}
            onClick={() => setMode("emailCode")}
          >
            Email Code
          </button>
          <button
            type="button"
            className={mode === "magicLink" ? "active" : ""}
            onClick={() => setMode("magicLink")}
          >
            Magic Link
          </button>
        </div>

        {mode === "password" && (
          <form onSubmit={handleSubmit}>
            <input
              name="username"
              required
              minLength={3}
              maxLength={20}
              type="text"
              placeholder="Username"
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
            />
            <button disabled={isLoading}>Login</button>
          </form>
        )}

        {mode === "emailCode" && (
          <>
            <form onSubmit={handleRequestCode}>
              <input
                type="email"
                placeholder="Email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <button disabled={isLoading}>Send Code</button>
            </form>
            <form onSubmit={handleVerifyCode}>
              <input
                type="text"
                placeholder="6-digit code"
                required
                value={emailCode}
                onChange={(e) => setEmailCode(e.target.value)}
              />
              <button disabled={isLoading}>Verify Code</button>
            </form>
          </>
        )}

        {mode === "magicLink" && (
          <form onSubmit={handleSendMagicLink}>
            <input
              type="email"
              placeholder="Email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button disabled={isLoading}>Send Magic Link</button>
          </form>
        )}

        {error && <span className="status error">{error}</span>}
        {message && <span className="status success">{message}</span>}
        <Link to="/register">Back to Register</Link>
      </div>
      <div className="imgContainer">
        <img src="/bg.png" alt="" />
      </div>
    </div>
  );
}

export default Login;
