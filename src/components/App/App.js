import React, {Component} from 'react';
import logo from '../../images/logo.svg';
import './App.css';
import LoginForm from '../LoginForm/LoginForm.js';
import firebase from 'firebase';
import firebaseConfig from '../../config';
firebase.initializeApp(firebaseConfig);

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: null,
            room_id: '',
            game_id: ''
        }
    }
    
    componentDidMount() {
        firebase.auth().onAuthStateChanged(user => {
            if(user !== null){
                firebase.firestore().collection("users").doc(user.uid).get()
                    .then((userdata)=>{
                        if(userdata.exists){
                            this.setState({
                                user: user,
                                room_id: userdata.data().room_id,
                            })
                        }
                });
            };
            this.setState({
                user: user,
            });
        });
    }
    
    updateRoomID(room_id){
        this.setState({
            room_id: room_id,
        });
    }
    updateGameID(game_id){
        this.setState({
            game_id: game_id,
        });
    }
    
    render() {
        return (
            <div className="app">
        <div className="app__header">
          <img src={logo} className="app__logo" alt="logo" />
          <h2>
            Party Games for Sequestered Folks
          </h2><LoginForm user={this.state.user} room_id={this.state.room_id} updateRoomID={this.updateRoomID.bind(this)} />
        </div>
        <div className="app__list">
        </div>
      </div>
        );
    }
}
export default App;