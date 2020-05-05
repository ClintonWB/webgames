import React, {Component} from 'react';
import './LoginForm.css';
import firebase from 'firebase';

export default class LoginForm extends Component {
    constructor(props) {
        super(props);
        this.state = {
            username_field: '',
            room_id_field: '',
            error_message: '',
        };
    }

    static getDerivedStateFromProps(props, state){
        var state_update = {};
        if (props.user !== state.user) {
            state_update["user"] = props.user;
            if(typeof(props.user) !== "undefined" && 
                props.user !== null && 
                props.user.displayName !== "null"){
                state_update["username_field"] = props.user.displayName || state.username_field;
            }
        }
        if(state_update !== {}){
            return state_update;
        }
        return false;
    }

    joinRoom(){
        if (this.state.room_id_field === ''){
            this.createRoom();
            return true;
        }
        var roomref = firebase.firestore().collection("gamerooms").doc(this.state.room_id_field);
        roomref.get().then((roomdata)=>{
            if(!roomdata.exists){
                this.createRoom(this.state.room_id_field);
                return;
            }
        firebase.auth().signInAnonymously().then(
            (result) => {
                result.user.updateProfile({
                    displayName: this.state.username_field,
                });
                roomref.update({
                    ['players.'+result.user.uid]:this.state.username_field
                });
                this.props.updateRoomID(this.state.room_id_field);
                this.initializePlayer(result.user.uid);
            });
        });
    }
    
    initializePlayer(uid){
        firebase.firestore().collection("users").doc(uid).set( {
                    username: this.state.username_field,
                    room_id: this.props.room_id,
                    provider: "anonymous",
                    created: new Date(),
                });
    }

    createRoom(room_id){
        var room_ref;
        if(typeof(room_id) === "undefined" || room_id === ""){
            room_ref = firebase.firestore().collection("gamerooms").doc();
        } else {
            room_ref = firebase.firestore().collection("gamerooms").doc(room_id);
        }
        firebase.auth().signInAnonymously().then(
        (result) => {
            result.user.updateProfile({
                displayName: this.state.username_field,
            });
            var gamedata = {
                playing: false,
                host: result.user.uid,
                players: {
                    [result.user.uid]: this.state.username_field,
                    },
                created: new Date(),
            };
            room_ref.set(gamedata).then(() => {
                this.props.updateRoomID(room_ref.id);
            }).then(this.initializePlayer.bind(this,result.user.uid));
        });
    }

    updateUsername(event) {
        this.setState({
            username_field: event.target.value
        });
    }
    updateRoomID(event) {
        this.setState({
            room_id_field: event.target.value
        });
    }

    handleLogOut() {
        firebase.auth().signOut();
    }

    handleKeyPress(event) {
        if (event.key !== 'Enter') return;
        this.handleSend();
    }
    
    render() {
        return (
        <div>
        {!this.props.user ?(
            <div className="login-form">
                <div className="form__row">
                    Name: <input
                        className="form__input"
                        type="text"
                        placeholder="Type message"
                        value={this.state.username_field}
                        onChange={this.updateUsername.bind(this)}
                    />
                    Room ID: <input
                        className="form__input"
                        type="text"
                        placeholder="Type message"
                        value={this.state.room_id_field}
                        onChange={this.updateRoomID.bind(this)}
                    />
                    <button
                        className="form__button"
                        onClick={this.joinRoom.bind(this)}
                        >
                        Create/Join Room
                    </button>
                </div>
            </div>
            ) : (
            <div>
                <span>
                    Name: {this.state.username_field} Room ID: {this.props.room_id}
                </span>
            <button
              className="app__button"
              onClick={this.handleLogOut.bind(this)}
            >
              Logout
            </button>
            </div>
            )
            }
         </div>
        );
    }
}