import React, {Component} from 'react';
import logo from '../../images/logo.svg';
import './App.css';
import LoginForm from '../LoginForm/LoginForm.js';
import GameSelector from '../GameSelector/GameSelector.js';
import firebase from 'firebase';
import firebaseConfig from '../../config';
firebase.initializeApp(firebaseConfig);

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
            user: null,
            room_id: '',
            game: null,
            room_ref: null,
            people: [],
        }
    }
    
    componentDidMount() {
        firebase.auth().onAuthStateChanged(user => {
            if(user !== null){
                firebase.firestore().collection("users").doc(user.uid).get()
                    .then((userdata)=>{
                        if(userdata.exists){
                            this.enterRoom(userdata.data().room_id);
                        }
                });
            };
            this.setState({
                user: user,
            });
        });
    }

    enterRoom(room_id){
        var room_ref = firebase.firestore().collection("gamerooms").doc(room_id);
        this.setState({
            room_id: room_id,
            room_ref: room_ref,
        })
        room_ref.onSnapshot(this.onRoomChange.bind(this));
    }

    onRoomChange(snapshot){
        this.setState({
            game: snapshot.get("game"),
            people: snapshot.get("players"),
        })
    }
    
    render() {
        return (
            <div className="app">
        <div className="app__header">
          <h2>
            Party Games for Sequestered Folks
          </h2><LoginForm user={this.state.user} room_id={this.state.room_id} updateRoomID={this.enterRoom.bind(this)} />
        </div>
        {(typeof(this.state.people) !== "undefined" && this.state.people !== null)?
            <div className="player__list">
                People:
                <ul>
                    { Object.keys(this.state.people).map((pid) =>
                        <li key={pid}> {this.state.people[pid]} </li>
                    )}
                </ul>
            </div>
        :<div> No People, Not Even You.</div>
        }
        <GameSelector gamedata={{user:this.state.user,
                                game:this.state.game,
                                room_ref:this.state.room_ref,
                                people:this.state.people
                                }}
                                />
      </div>
        );
    }
}
export default App;