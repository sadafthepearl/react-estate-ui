import { Link, useNavigate } from 'react-router-dom';
import './login.scss'
import { useContext, useState } from 'react';
import apiRequest from '../../lib/apiRequest';
import { AuthContext } from '../../context/AuthContext';

function Login() {
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);
  const [userId, setUserId] = useState(null);
  const [twoFactorToken, setTwoFactorToken] = useState("");

  const { updateUser } = useContext(AuthContext)

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("")
    setIsLoading(true);
    setError("")
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
      updateUser(res.data)

      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "Invalid Credentials!");
      console.error("Register error:", err)
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

      updateUser(res.data)
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "2FA Verification Failed!");
      console.error("2FA Verification error:", err)
    } finally {
      setIsLoading(false);
    }
  }
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
    <div className='login'>
      <div className="formContainer">
        <form onSubmit={handleSubmit}>
          <h1>Welcome Back</h1>
          <input
            name="username"
            required
            minLength={3}
            maxLength={20}
            type='text'
            placeholder='Username' />
          <input
            name='password'
            type='password'
            placeholder='Password'
          />
          <button>Login</button>
          {error && <span>{error}</span>}
          <Link to="/register">{"Don't"} you have an account</Link>
        </form>
      </div>
      <div className="imgContainer">
        <img src='/bg.png' alt='' />
      </div>
    </div>
  )
}

export default Login;