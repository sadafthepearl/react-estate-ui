import { useContext } from 'react'
import SearchBar from '../../components/searchBar/SearchBar'
import './homePage.scss'
import { AuthContext } from '../../context/AuthContext'

function HomePage() {

  const { currentUser } = useContext(AuthContext)

  console.log(currentUser)
  return (
    <div className='homePage'>
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