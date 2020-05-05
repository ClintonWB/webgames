import React, {Component} from 'react';
import './BucketOfPaper.css';
import firebase from 'firebase';

export default class BucketOfPaper extends Component {
    constructor(props) {
        super(props)
        this.state = {
            submitted: false,
            slip_suggestions: "",
            slip: ""
        }

    }

    updateSlips(event){
        this.setState({
            slip_suggestions: event.target.value,
        })
    }
    
    gcd(a,b) {
        a = Math.abs(a);
        b = Math.abs(b);
        if (b > a) {var temp = a; a = b; b = temp;}
        while (true) {
            if (b === 0) return a;
            a %= b;
            if (a === 0) return b;
            b %= a;
        }
    }

    submitSlips(){
        this.setState({
            submitted: true,
            })

        this.props.gamedata.room_ref.update({
            "game.slips":firebase.firestore.FieldValue.arrayUnion.apply(this,this.state.slip_suggestions.split(/\r?\n/)),
        });
    }

    startGame(){
        var slipcount = this.props.gamedata.game.slips.length;
        while(true){
            var increment = Math.floor(Math.random()*slipcount);
            if(this.gcd(slipcount,increment) === 1){
                break;
            }
        }

        this.props.gamedata.room_ref.update({
            "game.started":true,
            "game.slipcount":slipcount,
            "game.slipsdrawn":0,
            "game.slipincrement":increment,
        });
    }

    drawSlip(){
        var slipindex = ((this.props.gamedata.game.slipsdrawn+1)*
                          this.props.gamedata.game.slipincrement)%
                          this.props.gamedata.game.slipcount;
        this.setState({
            slip: this.props.gamedata.game.slips[slipindex],
        })
        this.props.gamedata.room_ref.update({
            "game.slipsdrawn":firebase.firestore.FieldValue.increment(1),
        })
    }
    
    static initialize(){
            this.props.gamedata.room_ref.update({
                game:{
                    type:"BucketOfPaper",
                }
            });
    }

    endGame(){
        this.props.gamedata.room_ref.update({
            game:firebase.firestore.FieldValue.delete(),
        })
    }

    render() {
        return (
            <div className="BucketOfPaper game">
                <h2> Bucket Of Paper Game </h2>
                {this.props.gamedata.game.started?
                <>
                {this.state.slip?
                <div className="bucketofpaper_slip">
                {this.state.slip}
                </div>
                :
                <></>
                }
                <div>
                <button className="game_button bucketofpaper_button" onClick={this.drawSlip.bind(this)}>
                    Draw Slip
                </button>
                </div>
                <div>
                <button className="game_button bucketofpaper_button" onClick={this.endGame.bind(this)}>
                    End Game
                </button>
                </div>
                </>
                :
                <>
                {!this.state.submitted?
                <>
                List your slips of paper, one per line.
                <div>
                <textarea  className="bucketofpaper_initial_input" onChange={this.updateSlips.bind(this)}>
                    {this.state.slip_suggestions}
                </textarea>
                </div>
                <div>
                <button className="game_button bucketofpaper_button" onClick={this.submitSlips.bind(this)}>
                    Submit Slips
                </button>
                </div>
                </>
                :
                <>
                <button className="game_button bucketofpaper_button" onClick={this.startGame.bind(this)}>
                    Start Game
                </button>
                </>
                }
                </>
                }
          </div>
        );
    }
}