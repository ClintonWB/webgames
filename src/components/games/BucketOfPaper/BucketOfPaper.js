import React, {Component} from 'react';
import './BucketOfPaper.css';
import firebase from 'firebase';
import {seeded_shuffle, random_seed} from '../../../lib/math.js';

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

    submitSlips(){
        this.setState({
            submitted: true,
            })

        this.props.gamedata.room_ref.update({
            "game.slips":firebase.firestore.FieldValue.arrayUnion.apply(this,this.state.slip_suggestions.split(/\r?\n/)),
        });
    }

    startGame(){
        let slipcount = this.props.gamedata.game.slips.length;
        let seed = random_seed();

        this.props.gamedata.room_ref.update({
            "game.started":true,
            "game.slipcount":slipcount,
            "game.slipsdrawn":-1,
            "game.seed":seed,
        });
    }

    drawSlip(){
        let slipindex = this.props.gamedata.game.slipsdrawn+1;
        if (slipindex < this.props.gamedata.game.slipcount){
            let deck = seeded_shuffle(this.props.gamedata.game.slips,
                                      this.props.gamedata.game.seed);                          
            this.setState({
              slip: deck[slipindex],
            }) ;
            this.props.gamedata.room_ref.update({
                "game.slipsdrawn":firebase.firestore.FieldValue.increment(1),
            });
        } else {
            slipindex = 0;
            let seed = random_seed();
            let deck = seeded_shuffle(this.props.gamedata.game.slips,
                                      seed);                          
            this.setState({
              slip: deck[slipindex],
            }) ;
            this.props.gamedata.room_ref.update({
                "game.slipsdrawn":0,
                "game.seed":seed,
            });
        }
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
                <div className="Slip Pool Display">
                <p>
                {this.props.gamedata.game.slipsdrawn+1} drawn out of {this.props.gamedata.game.slipcount} total. {this.props.gamedata.game.slipcount-this.props.gamedata.game.slipsdrawn-1} remain.
                </p>
                </div>
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
                <textarea  className="bucketofpaper_initial_input" onChange={this.updateSlips.bind(this)} defaultValue={this.state.slip_suggestions}>
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