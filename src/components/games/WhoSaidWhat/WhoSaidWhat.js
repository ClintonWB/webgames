import React, {Component} from 'react';
import './WhoSaidWhat.css';
import firebase from 'firebase';

export default class WhoSaidWhat extends Component {
    constructor(props) {
        super(props)
        this.state = {
        }
    }

    static initialize(){
        this.props.gamedata.room_ref.update({
            game:{
                type:"WhoSaidWhat",
                players:[],
                started:false,
            }
        });
    }
    
    endGame(){
        this.props.gamedata.room_ref.update({
            game:firebase.firestore.FieldValue.delete(),
        })
    }

    render() {
        var game = this.props.gamedata.game;
        var people = this.props.gamedata.people;
//        var user = this.props.gamedata.user;
//        var is_my_turn = (game.current_player === user.uid);
        return (
        <>
            <div className="WhoSaidWhat game">
            <h2> Who Said What? </h2>
                {game.prompt?
                <div>
                Prompt: {game.prompt}
                </div>
                :
                <>
                </>
                }
                {game.current_player?
                <div>
                Current Player: {people[game.current_player]}
                </div>
                :
                <>
                </>
                }
                
                {
                !game.started?
                <GameSetup gamedata={this.props.gamedata}/>
                :
                <GamePlay gamedata={this.props.gamedata}/>
                }
                
                
            <GameHistory history={game.history}/>
            </div>
        
        
        <button onClick={this.endGame.bind(this)}>End Game </button>
        </>
        
        );
    }
}

class GameSetup extends Component{
    constructor(props) {
        super(props)
        this.state = {
            prompt: "",
            statement: ""
        }

    }

    updatePrompt(event){
        this.setState({
            prompt: event.target.value,
        })
    }
    submitPrompt(){
        this.props.gamedata.room_ref.update({
            "game.prompt":this.state.prompt,
        });
    }
    updateStatement(event){
        this.setState({
            statement: event.target.value,
        })
    }
    submitStatement(){
        
        var position=0;
        if(typeof(this.props.gamedata.game.players) !== "undefined"){
            position = Object.keys(this.props.gamedata.game.players).length;
        }
        
        var payload = {
            ["game.players."+this.props.gamedata.user.uid]:{
                    'statement':this.state.statement,
                    'eliminated':false,
                    'position':position,
                    }
        }
        if(position === 0){
            payload["game.current_player"] = this.props.gamedata.user.uid;
        }
        
        this.props.gamedata.room_ref.update(payload);
    }

    startGame(){
        this.props.gamedata.room_ref.update({
            "game.started":true,
        });
    }  
    
    render(){
        var game = this.props.gamedata.game;
        var uid = this.props.gamedata.user.uid;
        
        if(!game.prompt){
            return (
            <div>
                <input value={this.state.prompt} onChange={this.updatePrompt.bind(this)}/>
                <button onClick={this.submitPrompt.bind(this)}> Submit Prompt </button>
            </div>
            );
        }
        
        if(typeof(game.players) === "undefined" || !(uid in game.players)){
            return (
            <div>
                <input value={this.state.statement} onChange={this.updateStatement.bind(this)}/>
                <button onClick={this.submitStatement.bind(this)}> Submit Statement </button>
            </div>
            );
        }
        return (
        <div>
            <button onClick={this.startGame.bind(this)}> Start Game </button>
        </div>
        );
    }
}

class GamePlay extends Component {
    constructor(props){
        super(props)
        
        var game = props.gamedata.game;
        var statement_order = [...Object.keys(game.players).keys()];
        this.shuffle(statement_order);
        this.state = {
            statement_order: statement_order,
            selected_user: props.gamedata.user.uid,
            selected_statement: props.gamedata.user.uid,
        }
    }
    
    nextPlayer(){
        var game = this.props.gamedata.game;
        var current_index = -1;
        if(typeof(game.current_player) !== "undefined"){
            current_index = game.players[game.current_player].position;
        }
        var player_count = Object.keys(game.players).length;
        var next_player = Object.entries(game.players)
              .filter(x=>!x[1].eliminated)
              .map(x=>{
                  var y=x[1];
                  y.pid = x[0];
                  y.rotated_position = (y.position - current_index - 1 + player_count)%player_count;
                  return y;
              })
              .sort((x,y)=>x.rotated_position-y.rotated_position)[0]
        return next_player.pid;
    }
    
    shuffle(a) {
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [a[i], a[j]] = [a[j], a[i]];
        }
        return a;
    }
    
    guess_row(){
        var game = this.props.gamedata.game;
//        var people = this.props.gamedata.people;
        var user = this.props.gamedata.user;
        if (game.current_player !== user.uid){
            return false;
        }
        if (this.state.selected_user === user.uid ||
            this.state.selected_statement === user.uid){
            return false;
        }
        if (game.players[this.state.selected_user].eliminated ||
            game.players[this.state.selected_statement].eliminated){
            return false;
        }
        if (this.state.selected_user === this.state.selected_statement){
            this.props.gamedata.room_ref.update({
                ["game.players."+this.state.selected_user+".eliminated"]: true,
            });
        } else {
            this.props.gamedata.room_ref.update({
                "game.current_player":this.nextPlayer(),
            });
        }
    }
    
    updateField(field,value){
        this.setState({
            [field]:value,
        })
    }

    render(){
        var game = this.props.gamedata.game;
        var people = this.props.gamedata.people;
        var user = this.props.gamedata.user;
        var is_my_turn = (game.current_player === user.uid);
        return (
        <div className="whosaidwhat_game_content">
        <div className="whosaidwhat_table">
        <div className="whosaidwhat_column whosaidwhat_column_players">
            {Object.entries(game.players)
                   .sort((x,y)=>x[1].position-y[1].position)
                   .map((entry) => {
                var player = entry[1];
                player.pid = entry[0];
                var is_my_guess = (player.pid === user.uid);
                return <div key={player.pid}>
                    <input className={`user ${player.eliminated?'eliminated':''} ${is_my_guess?'mine':''}`} id={`whosaidwhat_${player.pid}_user`} type="radio" name="target_user"
                        checked={this.state.selected_user === player.pid}
                        onChange={this.updateField.bind(this,'selected_user',player.pid)}
                        disabled={!is_my_turn || is_my_guess || player.eliminated}/>
                    <label htmlFor={`whosaidwhat_${player.pid}_user`}>{people[player.pid]}</label>
                </div>
            }
            )       
            }
        </div>
        <div className="whosaidwhat_column whosaidwhat_column_statements">
            {Object.entries(game.players)
                   .sort((x,y)=>this.state.statement_order[x[1].position]-
                                this.state.statement_order[y[1].position])
                   .map((entry) => {
                var player = entry[1];
                player.pid = entry[0];
                var is_my_guess = (player.pid === user.uid);
                return <div key={player.pid}>
                    <input className={`user ${player.eliminated?'eliminated':''} ${is_my_guess?'mine':''}`} id={`whosaidwhat_${player.pid}_statement`} type="radio" name="target_statement"
                        checked={this.state.selected_statement === player.pid}
                        onChange={this.updateField.bind(this,'selected_statement',player.pid)}
                        disabled={!is_my_turn || is_my_guess || player.eliminated}/>
                    <label htmlFor={`whosaidwhat_${player.pid}_statement`}>{player.statement}</label>
                </div>
            }
            )       
            }
        </div>
        </div>
        <button onClick={this.guess_row.bind(this)} disabled={!is_my_turn}>Guess</button>
        </div>);
    }
}

function GameHistory(props){
    return <></>;
}

