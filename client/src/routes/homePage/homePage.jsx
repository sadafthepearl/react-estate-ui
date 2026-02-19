import { useContext, useEffect, useState } from "react";
import SearchBar from '../../components/searchBar/SearchBar'
import './homePage.scss'
import { AuthContext } from '../../context/AuthContext'
import { useNavigate, useSearchParams } from "react-router-dom";
import apiRequest from "../../lib/apiRequest";

function HomePage() {

  const { updateUser } = useContext(AuthContext)
  const [showVerified, setShowVerified] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const magicSuccess = searchParams.get("magic") === "success";
    if (!magicSuccess) return;

    const syncUser = async () => {
      try {
        const res = await apiRequest.get("/auth/me");
        updateUser(res.data);
      } catch (err) {
        console.error("Failed to sync user after magic login:", err);
      } finally {
        setShowVerified(true);
        navigate("/", { replace: true });
      }
    };

    syncUser();
  }, [navigate, searchParams, updateUser]);

  return (
    <div className='homePage'>
      {showVerified && (
        <div className="verifyPopup" role="status" aria-live="polite">
          <div className="verifyCard">
            <h3>Email Verified</h3>
            <p>You are now signed in.</p>
            <button type="button" onClick={() => setShowVerified(false)}>
              Continue
            </button>
          </div>
        </div>
      )}
      <div className="textContainer">
        <div className="wrapper">
          <h1 className='title'>
            Find Real Estate & Get Your Dream Place
          </h1>
          <p>
            Lorem ipsum dolor sit amet consectetur adipisicing elit.
            At rem nam, nisi qui voluptas totam! Ut reiciendis laboriosam itaque inventore.
            Vel doloremque, quos eligendi officia in commodi aspernatur? At, veniam.
          </p>
          <SearchBar />
          <div className="boxes">
            <div className="box">
              <h1>16+</h1>
              <h2>Years of Experiences</h2>
            </div>
            <div className="box">
              <h1>200</h1>
              <h2>Award Gained</h2>
            </div>
            <div className="box">
              <h1>1200+</h1>
              <h2>Property Ready</h2>
            </div>
          </div>
        </div>
      </div>
      <div className="imgContainer">
        <img src='./bg.png' alt='' />
      </div>
    </div>
  )
}

export default HomePage  
