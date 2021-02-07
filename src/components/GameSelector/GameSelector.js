import React, {Component} from 'react';
import './GameSelector.css';
//import firebase from 'firebase';

import WhoSaidWhat from '../games/WhoSaidWhat/WhoSaidWhat.js';
//import Wavelength from '../games/Wavelength/Wavelength';
import BucketOfPaper from '../games/BucketOfPaper/BucketOfPaper.js';
//import WhoSaidWhat from '../games/WhoSaidWhat/WhoSaidWhat';
import LetterJam from '../games/LetterJam/LetterJam.js';

const game_list = {
                   "Who Said What": WhoSaidWhat,
//                   Wavelength: Wavelength,
                   "Bucket Of Paper": BucketOfPaper,
//                   NamesOnHats: NamesOnHats,
                   "Letter Jam": LetterJam,
};

export default class GameSelector extends Component {
    constructor(props) {
        super(props);
        this.state = {
            selected_game:"BucketOfPaper",
        };
    }

    updateGameTypeSelector(event){
        this.setState({
            selected_game: event.target.value,
        }
        )
    }

    opengame(){
        game_list[this.state.selected_game].initialize.bind(this)();
    }

    render() {
        if(!this.props.gamedata.user){
            return(<div>Log In To Join Game</div>);
        }
        if(!this.props.gamedata.game){
            return (
                <div className="game_selector">
                    Game: <select
                        id="game_select_dropdown"
                        list="implemented_games"
                        placeholder="Type message"
                        value={this.state.selected_game}
                        onChange={this.updateGameTypeSelector.bind(this)}
                    >
                        {Object.keys(game_list).map((game) => 
                            <option key={game} value={game}> {game} </option>
                        )
                        }
                    </select>
                    <button
                        className="form__button"
                        onClick={this.opengame.bind(this)}
                        >
                        Start Game
                    </button>
                </div>
                );
        }
        var GameTag = game_list[this.props.gamedata.game.type];
            return(
                <GameTag gamedata={this.props.gamedata}/>
                );
    }
}