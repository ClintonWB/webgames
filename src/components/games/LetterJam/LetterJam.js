import React, {Component} from 'react';
import './LetterJam.css';
import firebase from 'firebase';
import jam_facts from './jam_facts.js';
import {seeded_shuffle, seeded_derangement} from '../../../lib/math.js';

export default class LetterJam extends Component {

    static initialize(){
        this.props.gamedata.room_ref.update({
            game:{
                type:"Letter Jam",
                players:[],
                started:false,
                finals:false,
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
        return (
        <div className="letterjam">
            <div className="WhoSaidWhat game">
            <h2> Letter Jam </h2>  
            <h3> A game of spelling words that do not have the letters J,Q,V,X, or Z in them.</h3>              
                {
                !game.started?
                    <LetterJamSetup gamedata={this.props.gamedata}/>
                :
                    <>
                    {(this.props.gamedata.user.uid in game.players)?
                        <>
                        {this.props.gamedata.game.finals?
                            <LetterJamFinals gamedata={this.props.gamedata}/>
                        :
                            <LetterJamPlay gamedata={this.props.gamedata}/>
                        }
                        </>
                    :
                        <div>
                        Letter Jam Game in progress. Spectator mode not yet implemented; please wait until the game is finished.
                        </div>
                    }
                </>
            }
            
            </div>
            {this.props.gamedata.user.uid === this.props.gamedata.host?
            <button onClick={this.endGame.bind(this)}>End Game </button>
            :
            <></>
            }
        </div>
        
        );
    }
}

class LetterJamSetup extends Component {
    constructor(props) {
        super(props)
        this.state = {
        }
    }
        
    word_validator = /^[ABCDEFGHIKLMNOPRSTUWY]{5}$/;
    
    updateWord(event){
        this.setState({
            word: event.target.value,
        })
    }
    
    randomWord(){
        let words = jam_facts["simple_english_words"];
        let word = words[Math.floor(Math.random()*words.length)].toUpperCase();
        this.setState({
            word: word,
        });
    }
    
    submitWord(){
        let word="";
        if (typeof(this.state.word) == "undefined" ||
            this.state.word.trim() === ""){
            let words = jam_facts["simple_english_words"];
            word = words[Math.floor(Math.random()*words.length)].toUpperCase();
        } else {
            word=this.state.word.trim().toUpperCase();
        }
        if (word.match(this.word_validator)){
            this.props.gamedata.room_ref.update({
                ["game.players."+this.props.gamedata.user.uid]:{
                        'submitted_word':word,
                        }
            })
        }
    }
    
    startGame(){
        let player_dict = this.props.gamedata.game.players;
        let player_ids = Object.keys(player_dict);
        let submitted_words = Object.values(player_dict).map(x=>x["submitted_word"]);
        let shuffled_words = seeded_derangement(submitted_words);
        let chosen_letters = [];
        for(let i=0;i<player_ids.length;i++){
            let player_data = player_dict[player_ids[i]];
            Object.assign(player_data, {
                target_word:shuffled_words[i],
                target_letters:seeded_shuffle(shuffled_words[i].split('')),
                letter_position:0,
                letter_guesses:[],
                clues_given:[],
                clues_received:[],
                passed_move_on:false,
                can_move_on:false,
                voted_player_clue:null,
                proposed_clue:[],
            })
            chosen_letters.push(...player_data.target_letters);
            player_data["current_letter"]=player_data.target_letters[0];
            player_dict[player_ids[i]] = player_data;
        }
        
        let turn_limits = jam_facts.turn_limits[player_ids.length]
        
        let deck = jam_facts.deck.slice();
        for(let letter of chosen_letters){
            let index = deck.indexOf(letter);
            if(index !== -1){
                deck.splice(index,1);
            }
        }
        
        deck = seeded_shuffle(deck);
        
        let npcs = turn_limits.npc_stacks.map((count,index)=>{
            return {
                remaining_cards:count,
                current_letter:deck[index],
            }
        });
        
        this.props.gamedata.room_ref.update({
            "game.players":player_dict,
            "game.started":1,
            "game.round":0,
            "game.deck":deck,
            "game.deck_position":npcs.length,
            "game.npcs":npcs,
            "game.bonus_letters":[],
            "game.clues":[],
            "game.turn_limits":turn_limits,
        })
        
    }
    
    render() {
        let game = this.props.gamedata.game;
        let uid = this.props.gamedata.user.uid;
        let joined_game = (typeof(game.players) !== "undefined" && 
                           uid in game.players);
        
        if (!joined_game){
            return (
            <>
            <div>
            <p> Type a secret word for another player to find. You should choose a word that is known to everyone at the table, is 5 letters, and does not include the letters J,Q,V,X, or Z. 
            </p>
            <p> If you cannot think of one, you can let the computer choose a random simple english word meeting these criteria.
            </p>
            <input className="letterjam-word-input" onChange={this.updateWord.bind(this)} defaultValue={this.state.word} maxLength="5"></input>
            </div><div>
            <button onClick={this.submitWord.bind(this)}> Submit Word </button> <button onClick={this.randomWord.bind(this)}>Get Random Valid Simple English Word</button>
            </div>
            </>
        )};
        
        let player_count = Object.keys(game.players).length;
        if (player_count < 2){
            return(<><div><p>Waiting on a second player to join.</p></div></>)
        }    
        let player_names = Object.keys(game.players).map((uid) => <li key={uid}>{this.props.gamedata.people[uid]}</li>)
        return(<>
                <div>
                    <p>Waiting for game to start.</p>
                    <p> There are {Object.keys(game.players).length} players in game:</p>
                    <ul>{player_names}</ul>
                    <button onClick={this.startGame.bind(this)}>Start Game</button>
                </div>
            </>)
    }
}


class LetterJamPlay extends Component {
    constructor(props) {
        super(props)
//        let uid = this.props.gamedata.user.uid;
        let game = props.gamedata.game;
        this.state = {
            proposal: [],
            round: game.round,
        }
    }

    static getDerivedStateFromProps(props, state){
        if(state.round !== props.gamedata.game.round){
            state.proposal = [];
            state.round = props.gamedata.game.round;
        } 
        return state;
    }


    appendToProposal(id){
        
        var new_proposal = this.state.proposal.slice();
        new_proposal.push(id);
        this.setState({
            proposal:new_proposal,
        })
    }
    
    
    removeFromProposal(index){
        
        let new_proposal = this.state.proposal.slice();
        new_proposal.splice(index,1);
        this.setState({
            proposal:new_proposal,
        })
    }
    
    voteToEnd(event){
        let game = this.props.gamedata.game;
        let uid = this.props.gamedata.user.uid;
        if(Object.keys(game.players)
            .filter(x=>x!==uid)
            .every(x=>game.players[x].ready_to_end)){
                let bonus_letters = game.bonus_letters.slice();
                bonus_letters.push("*");
                this.props.gamedata.room_ref.update({
                    ["game.players."+uid+".ready_to_end"]: true,
                    "game.finals":true,
                    "game.bonus_letters":bonus_letters,
                });
                
        } else {
            this.props.gamedata.room_ref.update({
                ["game.players."+uid+".ready_to_end"]: true,
            });
        }
    }
    
    unvoteToEnd(event){
        let uid = this.props.gamedata.user.uid;
        {
            this.props.gamedata.room_ref.update({
                ["game.players."+uid+".ready_to_end"]: false,
            });
        }
    }
    
    render() {
        let game = this.props.gamedata.game;
        let turn_limits = jam_facts.turn_limits[Object.keys(game.players).length];
    
        let free_turns = turn_limits.default;
        let npcs_unfinished = 0;
        for(let npc of game.npcs){
            if(npc.remaining_cards === 0){
                free_turns++;
            } else {
                npcs_unfinished++;
            }
        }
        
        let unfinished_players = Object.keys(game.players).filter(
            uid => game.players[uid].clues_given.length < turn_limits.per_player
        );
        
        let player_clues_remaining = unfinished_players.map(
            uid=>turn_limits.per_player-game.players[uid].clues_given.length
        ).reduce((x,y)=>x+y,0);
        
        if(unfinished_players.length === 0){
            free_turns += turn_limits.clear_bonus;
        }
        
        free_turns -= game.round;
        free_turns += Object.keys(game.players).length*turn_limits.per_player-player_clues_remaining;
        
        let able_to_play = ((free_turns >0) ||
            (unfinished_players.indexOf(this.props.gamedata.user.uid) !== -1));
        
        let out_of_turns = (player_clues_remaining+free_turns === 0);
        let everyone_on_bonus = Object.values(game.players).every(
            player=>player.letter_position >= player.target_letters.length
        ) 
        
        return (
            <>
            <div>
            Round {game.round+1}
            </div>
            <div>
            <p>
            Free clues left: {free_turns}
            </p>
            {unfinished_players.length>0?
            <p>
            Player-specific clues left: {player_clues_remaining}
            </p>
            :<></>}
            {npcs_unfinished>0?
            <p>
            {npcs_unfinished} clue(s) can be earned from NPCs.
            </p>
            :<></>}
            {unfinished_players.length>0?
            <p>
            {turn_limits.clear_bonus} clue(s) can be earned from giving all player-specific clues.
            </p>
            :<></>}
            </div>
            <div className="letterjam-finalvoting">
            {everyone_on_bonus || out_of_turns?
                <>
            {everyone_on_bonus?<p>Everyone has moved on past their provided words.</p>:<></>}
            {out_of_turns?<p>Nobody can give a clue.</p>:<></>}
            <p> Are you ready for the final phase? </p>
            {this.props.gamedata.game.players[this.props.gamedata.user.uid].ready_to_end?
                <button onClick={this.unvoteToEnd.bind(this)}>Unvote to End</button>
                    :
            <button onClick={this.voteToEnd.bind(this)}>Vote to End</button>
            }  
            </>
            :<></>}
            </div>
            
            <div className="letterjam-proposalarea">
                <PlayersDisplay gamedata={this.props.gamedata}
                    addCard={this.appendToProposal.bind(this)}
                    />
                <ProposalBuilder 
                    gamedata={this.props.gamedata}
                    proposal={this.state.proposal}
                    remove={this.removeFromProposal.bind(this)}
                    able_to_play={able_to_play}
                    />
            </div>
            <div className="letterjam-cluearea">
                <ClueHelperSelector gamedata={this.props.gamedata}/>
                <ClueViewer gamedata={this.props.gamedata} />
            </div>
            </>
        );
    }
}

class LetterJamFinals extends Component {
    constructor(props) {
        super(props)
        this.state = {
            final_guess:[],
        }
    }
    
    
    static getDerivedStateFromProps(props, state){
        let bonus_letters = props.gamedata.game.bonus_letters.slice();
        for (let guess_letter of state.final_guess){
            if (/^\d$/.test(guess_letter)){
                continue;
            }
            let bonus_index = bonus_letters.indexOf(guess_letter);
            if(bonus_index === -1){
                state.final_guess = [];
                return state;
            }
            bonus_letters.splice(bonus_index,1);
        }
        
        return state;
    }
    
    addLetter(event){
        let final_guess = this.state.final_guess.slice();
        final_guess.push(event.target.getAttribute("letter"));
        this.setState({
            final_guess:final_guess,
        });
    }
    
    removeLetter(event){
        let final_guess = this.state.final_guess.slice();
        let index = parseInt(event.target.getAttribute("position"));
        final_guess.splice(index,1);
        this.setState({
            final_guess:final_guess,
        });
    }
    
    submitFinalWord(event){
        let bonus_letters = this.props.gamedata.game.bonus_letters.slice();
        let uid = this.props.gamedata.user.uid;
        let player =  this.props.gamedata.game.players[uid];
        for (let guess_letter of this.state.final_guess){
            if (/^\d$/.test(guess_letter)){
                continue;
            }
            let bonus_index = bonus_letters.indexOf(guess_letter);
            bonus_letters.splice(bonus_index,1);
        }
        let final_word = this.state.final_guess.join("").replace(
            /\d/g,
            (x)=> player.target_letters[parseInt(x)]
        )
        
        
        this.props.gamedata.room_ref.update({
            ["game.players."+this.props.gamedata.user.uid+".final_word"]: final_word,
            "game.bonus_letters":bonus_letters,
        });
        
    }
    
    render(){
        let game = this.props.gamedata.game;
        let uid = this.props.gamedata.user.uid;
        let player =  game.players[uid];
        let bonus_letters = game.bonus_letters.slice();
        let player_pool = Array(player.target_letters.length)
                            .fill(1)
                            .map((_,index)=>index);
        
        for (let guess_letter of this.state.final_guess){
            if (/^\d$/.test(guess_letter)){
                player_pool.splice(player_pool.indexOf(parseInt(guess_letter)),1);
            } else {
                let bonus_index = bonus_letters.indexOf(guess_letter);
                bonus_letters.splice(bonus_index,1);
            }
        }
        let letter_pool = player_pool.map((x,index) =>
            <div key={"player_"+index} letter={x} onClick={this.addLetter.bind(this)} className={"letterjam-letter letterjam-letter-clickable letterjam-letter-player-"+parseInt(x)} >{player.letter_guesses[parseInt(x)]||(parseInt(x)+1).toString()}</div>
        ).concat(bonus_letters.map((x,index)=>
            <div key={"bonus_"+index} letter={x} onClick={this.addLetter.bind(this)} className="letterjam-letter letterjam-letter-clickable" >{x}</div>
        ));
        
        let guess_word = this.state.final_guess.map((x,index) => {
            if (/^\d$/.test(x)){
                return <div key={"player_"+index}
                            position={index}
                            onClick={this.removeLetter.bind(this)}
                            className={"letterjam-letter letterjam-letter-clickable letterjam-letter-player-"+parseInt(x)} >{player.letter_guesses[parseInt(x)]||(parseInt(x)+1).toString()}</div>
            } else {
                return <div key={"bonus_"+index}
                            position={index}
                            onClick={this.removeLetter.bind(this)}
                            className="letterjam-letter letterjam-letter-clickable" >{x}</div>
            }});
        
        return (<>
            {player.final_word?
                <>
                <p>
                Congratulations! The game is over, at least for you.
                </p>
                </>
            :
            <>
            <div>
            <p>
            The game is almost over.
            </p>
            <p>
            Your last task is to spell a 5+ letter word, using your secret letters and any bonus letters or the wild.
            </p> 
            <p>
            However, unlike in previous rounds, each letter <em>including the wild</em> can be used <em>only once, by one player</em>.
            </p> 
            <p>
            If a player uses a bonus letter in their word, it dissapears for everyone.
            </p>
            </div>
            <div className="letterjam-finals-pool">
            <p> Letter Pool: </p>
            <div>
            {letter_pool}
            </div>
            </div>
            <div className="letterjam-finals-word">
            <p> Final Word: </p>
            <div>
            {guess_word}
            </div>
            </div>
            <div>
            <button onClick={this.submitFinalWord.bind(this)} disabled={this.state.final_guess.length<player.target_letters.length}>Submit Final Guess</button> 
            </div>
            <div>
            <ClueHelperSelector gamedata={this.props.gamedata} />
            </div>
            </>
            }
            <FinalWordList gamedata={this.props.gamedata} />
            {player.final_word?
                <ClueRetrospective gamedata={this.props.gamedata}/>
                :<></>}
            </>
        );
    }
}

class FinalWordList extends Component {
    render(){
        let player_finals = [];
        for(let uid in this.props.gamedata.game.players){
            let name = this.props.gamedata.people[uid];
            let player = this.props.gamedata.game.players[uid];
            if (player.final_word){
                player_finals.push(<div key={uid} className="letterjam-final-presentation">
            <p>
            {name} spelled {player.final_word}; Their original word was {player.target_word}.
            </p>
            </div>)
            } 
        }
        return(<div className="letterjam-finalwordlist">
            {player_finals}
        </div>)
    }
}

class SelectableCard extends Component {
    addThisCard = function(){
         this.props.addCard(this.props.id);
    }
    
    render(){
        let class_tag = "letterjam-letter-";
        switch(this.props.id[0]){
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
                class_tag += "player-"+this.props.id[0];
                break;
            case "B":
                class_tag += "bonus";
                break;
            case "N":
                class_tag += "npc";
                break;
            default:
                class_tag += "error";
                break;
        }
        
        return (
            <div className={"letterjam-letter letterjam-letter-faceup letterjam-letter-clickable "+class_tag}
                 onClick={this.addThisCard.bind(this)}>
                {this.props.letter}
            </div>
        );
    }
}

class PlayersDisplay extends Component {
    render() {
        var game = this.props.gamedata.game;
        let player_panels = Object.keys(game.players).sort().map(
            (uid,index) => 
            <PlayerPanel gamedata={this.props.gamedata} addCard={this.props.addCard} uid={uid} index={index} key={uid}/>
        );
        
        let npc_panels = game.npcs.map((npc,index) => <div className="letterjam-npcpanel letterjam-characterpanel" key={"npc_"+index}>
        <SelectableCard id={"N"+index+npc.current_letter} addCard={this.props.addCard} letter={npc.current_letter}/>
         <p>NPC</p>
         {npc.remaining_cards !== 0?
         <p>needs {npc.remaining_cards} clues. </p>
         :<></>}
        </div>);
        let bonus_letters = game.bonus_letters.map((letter,index) => 
            <div  key={"bonus_"+index} className="letterjam-bonus">
            <SelectableCard addCard={this.props.addCard} id={"B"+index+letter} letter={letter}/>
            <p>Bonus</p>
            </div>
        );
        return (
        <div className="letterjam-playersdisplay">
        <div className="letterjam-card-row">
                {player_panels}
                {npc_panels}
            <div key="wild" className="letterjam-wildcard-block">
                <div className="letterjam-wild">
                <SelectableCard addCard={this.props.addCard} id={"***"} letter={"*"}/>
                <p> Wild</p>
                </div>
            </div>
                {bonus_letters}
        </div>
        </div>
        
        );
    }
}

class PlayerPanel extends Component {
    constructor(props) {
        super(props)
        this.state = {
        }
    }
    
    voteProposal(event){
        this.props.gamedata.room_ref.update({
            ["game.players."+this.props.gamedata.user.uid+".voted_player_clue"]: this.props.index,
        });
    }
    
    encodeClue(index,clue){
        return "".concat(...clue.map(clue_letter=>
            (clue_letter[0]===index.toString()?clue_letter[1]:clue_letter[2])
        ));
    }
    
    submitClue(event){
        var game = this.props.gamedata.game;
        let my_uid = this.props.gamedata.user.uid;
        let clue = game.players[my_uid].proposed_clue;
        game.players[my_uid].clues_given.push(clue.join(" "));
        game.clues.push(clue.join(" "));
        game.round += 1;
        let player_list = Object.keys(game.players).sort();
        for(let player_index=0;player_index<player_list.length;player_index++){
            let uid = player_list[player_index];
            let received_hint = clue.some(letter=>letter[0]===player_index.toString());
            let encoded_clue = this.encodeClue(player_index,clue);
            game.players[uid].voted_player_clue = null;
            game.players[uid].passed_move_on = false;
            game.players[uid].proposed_clue = [];
            game.players[uid].clues_received.push(encoded_clue);
            if(received_hint){
                game.players[uid].can_move_on = true;
            }
            
        }
        
        let used_npcs = new Set();
        let used_bonuses = new Set();
    
        for (let clue_letter of clue){
            switch(clue_letter[0]){
                case "N":
                    used_npcs.add(clue_letter[1]);
                    break;
                case "B":
                    used_bonuses.add(clue_letter[2]);
                    break;
                default:
                    break;
            }
        }
        
        for (let used_npc of used_npcs){
            game.npcs[used_npc].current_letter = game.deck[game.deck_position++];
            if (game.npcs[used_npc].remaining_cards>0){
                game.npcs[used_npc].remaining_cards--;
            }
        }
        
        for (let used_bonus of used_bonuses){
            let bonus_index = game.bonus_letters.indexOf(used_bonus);
            game.bonus_letters.splice(bonus_index,1);
        }
        
        this.props.gamedata.room_ref.update({
            game: game,
        });
    }
    
    render() {
        var game = this.props.gamedata.game;
        var target_player = this.props.gamedata.game.players[this.props.uid];
        var is_me = (this.props.uid === this.props.gamedata.user.uid);
                
        let vote_count = 0;
        for (let player_data of Object.values(game.players)){
            if (this.props.index === player_data.voted_player_clue){
                vote_count += 1;
            }
        }
        
        var proposal_block=<>{target_player.proposed_clue.length>0?<>
            <ProposalAnalysis proposal={target_player.proposed_clue}/>
            <button onClick={this.voteProposal.bind(this)}>Vote</button>
            {vote_count>0?<>
                <p>Votes: {vote_count}</p>
                </>
                :<></>}
            {is_me && vote_count>Object.keys(game.players).length/2?
                <div>
                <button onClick={this.submitClue.bind(this)}>
                Give Clue
                </button>
                </div>
                :<></>}
            </>:<></>}</>
        
        let turn_limits = jam_facts.turn_limits[Object.keys(game.players).length];
        let player_clues_remaining = Math.max(0,turn_limits.per_player-target_player.clues_given.length);
        
        // Common Setup
        return (<>
        <div className="letterjam-playerpanel letterjam-characterpanel">
        <div className="letterjam-playerpanel-word">
        {is_me?
        <div key={"Player_"+this.props.index} 
            className={"letterjam-letter letterjam-letter-faceup letterjam-letter-player-"+this.props.index}>
                        ?
                    </div>
                                :
        <SelectableCard
                    addCard={this.props.addCard}
                    key={target_player.letter_position}
                    id={"".concat(this.props.index,target_player.letter_position,target_player.current_letter)}
                    letter={target_player.current_letter}/>
                }
        </div>
        <p className="letterjam-playerpanel-name">
        {this.props.gamedata.people[this.props.uid]}
        </p>
        {player_clues_remaining>0?
            <p>
            {player_clues_remaining} player clues left.
            </p>
        :<></>}
        <div className="letterjam-advance-block">
            <>
            <p> Letter {target_player.letter_position+1} of {target_player.target_letters.length}.
            </p>
            {target_player.can_move_on?
                <>
                <p>Can advance.</p>
                <p>{target_player.passed_move_on?"Has passed.":"Has not passed."}</p>
                </>:
                <><p>Needs Clue To Advance.</p>
                </>
            }
            </>
        </div>
        <div className="letterjam-proposal">
        {proposal_block}
        </div>
        </div>
        </>
        
        );
    }        
}

class ClueHelperSelector extends Component{
    constructor(props) {
        super(props)
        let uid = props.gamedata.user.uid;
        let player =  props.gamedata.game.players[uid];
        if(props.gamedata.game.finals){
            let position = Math.min(player.letter_position,
                                    player.target_letters.length-1);
            this.state = {
                letter_position:position,
                max_letter_position:position,
            } 
        } else {
            this.state = {
                letter_position:player.letter_position,
                max_letter_position:player.letter_position,
            }
        }
    }
    
    
    static getDerivedStateFromProps(props, state){
        let uid = props.gamedata.user.uid;
        let player =  props.gamedata.game.players[uid];
        if(!props.gamedata.game.finals && 
            state.max_letter_position !== player.letter_position){
            state = {
                letter_position:player.letter_position,
                max_letter_position:player.letter_position,
            }
        } 
        return state;
    }
    
    switchToTab(event){
        let new_tab = parseInt(event.target.getAttribute("number"));
        this.setState({
            letter_position:new_tab,
        })
    }
    
    render(){
        let tabs = Array(this.state.max_letter_position+1).fill(0).map(
            (_,index) =>
            <div className={"letterjam-cluehelper-selector-tab "+(index===this.state.letter_position?"letterjam-cluehelper-selector-tab-selected":"")}
                key={index}
                number={index}
                onClick={this.switchToTab.bind(this)}>
                {index+1}
            </div>
        )
        let helpers = Array(this.state.max_letter_position+1).fill(0).map(
            (_,index) =>
            <ClueHelper gamedata={this.props.gamedata} key={index} letter_position={index} visible_position={this.state.letter_position}/>
        )
        
        
        return(
        <div className="letterjam-cluehelper-selector">
        <div className="letterjam-cluehelper-selector-internal">
        <div className="letterjam-cluehelper-selector-bar">
        {tabs}
        </div>
        {helpers}
        </div>
        </div>
        )
    }
}

class ClueHelper extends Component{
    constructor(props) {
        super(props)
        let uid = props.gamedata.user.uid;
        let player =  props.gamedata.game.players[uid];
        this.state = {
            guess:player.letter_guesses[props.letter_position] || "",
        }
    }
    
    advancePlayer(event){
        let game = this.props.gamedata.game;
        let uid = this.props.gamedata.user.uid;
        game.players[uid].letter_guesses[game.players[uid].letter_position]=this.state.guess;
        game.players[uid].letter_position++;
        if(game.players[uid].letter_position<game.players[uid].target_letters.length){
            game.players[uid].current_letter = game.players[uid].target_letters[game.players[uid].letter_position];
        } else {
            game.players[uid].current_letter = game.deck[game.deck_position++];
        }
        game.players[uid].can_move_on=false;
        game.players[uid].passed_move_on=true;
        this.props.gamedata.room_ref.update({
            game:game,
        });
        
    }
    
    guessBonusLetter(event){
        let game = this.props.gamedata.game;
        let uid = this.props.gamedata.user.uid;
        game.players[uid].letter_position++;
        if(this.state.guess.toUpperCase() === game.players[uid].current_letter){
            game.bonus_letters.push(game.players[uid].current_letter);
        }
        game.players[uid].current_letter = game.deck[game.deck_position++];
        game.players[uid].can_move_on=false;
        game.players[uid].passed_move_on=true;
        this.props.gamedata.room_ref.update({
            game:game,
        });
        
    }
    
    passMovingOn(event){
        this.props.gamedata.room_ref.update({
            ["game.players."+this.props.gamedata.user.uid+".passed_move_on"]: true,
        });
    }
    unpassMovingOn(event){
        this.props.gamedata.room_ref.update({
            ["game.players."+this.props.gamedata.user.uid+".passed_move_on"]: false,
        });
    }
    
    updateGuess(event){
        this.setState({
            guess: event.target.value,
        })
    }
    
    pushGuess(event){
        let uid = this.props.gamedata.user.uid;
        let player =  this.props.gamedata.game.players[uid];
        let guesses = player.letter_guesses;
        guesses[this.props.letter_position] = this.state.guess;
        this.props.gamedata.room_ref.update({
            ["game.players."+this.props.gamedata.user.uid+".letter_guesses"]: guesses,
        });
    }
    
    render(){
        if(this.props.letter_position !== this.props.visible_position){
            return(<></>);
        }
        let my_uid = this.props.gamedata.user.uid;
        let target_player = this.props.gamedata.game.players[my_uid];
        let clue_rows = [];
        let guess_string = this.state.guess || "?";
        for (let clue of target_player.clues_received){
            let position_string = this.props.letter_position.toString(); 
            if(clue.indexOf(position_string) === -1){
                continue;
            }
            let clue_row = <tr key={clue_rows.length}>{clue.split('').map((letter,index) =>{
                if(letter === position_string){
                    return(<td key={index+guess_string} className="letterjam-cluehelper-guessed-letter">
                        {guess_string}
                        </td>);
                }
                return(<td key={index}> {letter}
                </td>
                )
                })}
                </tr>;
                clue_rows.push(clue_row);
        }
        
        
        
        return(<div className="letterjam-cluehelper">
        <div className="letterjam-cluehelper-internal">
        <p>
        Clue Helper
        </p>
        <table>
        <tbody>
            {clue_rows}
            </tbody>
        </table>
        <input className="letterjam-cluehelper-guess"
            onChange={this.updateGuess.bind(this)}
            onBlur={this.pushGuess.bind(this)}
            defaultValue={this.state.guess} maxLength="1"
            ></input>
        {!this.props.gamedata.finals && target_player.can_move_on && this.props.letter_position === target_player.letter_position?
        <>
        {target_player.letter_position<target_player.target_letters.length?
        <button onClick={this.advancePlayer.bind(this)}>Advance</button>
        :
        <>
        <button onClick={this.guessBonusLetter.bind(this)}>Guess Letter</button>
        </>
        }
        {target_player.passed_move_on?
        <button onClick={this.unpassMovingOn.bind(this)}>Unpass</button>
        :
        <button onClick={this.passMovingOn.bind(this)}>Pass</button>
        }</>
        :
        <>
        </>}
        </div>
        </div>);
    }
}

class ProposalAnalysis extends Component{
    render(){
        let clue_helps = new Set();
        let clue_wilds = 0;
        let clue_npcs = new Set();
        let clue_bonus = new Set();
        for (let card of this.props.proposal){
            switch(card[0]){
                case "N":
                    clue_npcs.add(card[1]);
                    break;
                case "B":
                    clue_bonus.add(card[1]);
                    break;
                case "*":
                    clue_wilds += 1;
                    break;
                case "0":
                case "1":
                case "2":
                case "3":
                case "4":
                case "5":
                    clue_helps.add(card[0]);
                    break;
                default:
                    console.warn("Unable to match clue " + card);
                    break;
            } 
        }

        return <div className="letterjam-proposalinfo">
        <div className="letterjam-proposalinfo-cluelength">Length {this.props.proposal.length}</div>
        <div className="letterjam-proposalinfo-cluehelps">Helps {clue_helps.size} Player(s)</div>
        <div className="letterjam-proposalinfo-cluewilds">Uses {clue_wilds} Wild(s)</div>
        {clue_npcs.size>0?
        <div className="letterjam-proposalinfo-cluebonus">Uses {clue_npcs.size} NPC Card(s)</div>
        :<></>}
        {clue_bonus.size>0?
        <div className="letterjam-proposalinfo-cluebonus">Uses {clue_bonus.size} Bonus Card(s)</div>
        :<></>}
        </div> 
    }
}

class ProposalBuilder extends Component {
    
    submitProposal(event){
        if (!this.props.able_to_play){
            return;
        }
        let players = Object.assign({},this.props.gamedata.game.players);
        let my_uid = this.props.gamedata.user.uid;
        if(players[my_uid].proposed_clue.join("") === this.props.proposal.join("")){
            return;
        }
        let my_index = Object.keys(players).sort().indexOf(my_uid);
        for(let uid of Object.keys(players)){
            if (uid === my_uid){
                players[uid].proposed_clue = this.props.proposal;
            }
            if(players[uid].voted_player_clue === my_index){
                players[uid].voted_player_clue = null;
            }
        }
        
        this.props.gamedata.room_ref.update({
            "game.players": players,
        });
    }
    
    render() {
        let proposal_cards = this.props.proposal.map((card,index) =>
            <ProposalBuilderCard remove={this.props.remove}
                                 index={index}
                                 key={index}
                                 id={card}
                                 letter={card[card.length-1]}/>
        )

        return(
            <div className="letterjam-proposalbuilder">
            <ProposalAnalysis proposal={this.props.proposal}/>
            <div className="letterjam-proposalbuilder-core">
            <p>
            Proposal Builder
            </p>
            <div>
            {proposal_cards}
            </div>
            <button onClick={this.submitProposal.bind(this)} 
                disabled={!this.props.able_to_play}
                >Propose Clue</button>
            </div>
            <div className="letterjam-proposalbuilder-end"></div>
            </div>);
    }
}

class ProposalBuilderCard extends Component {
    removeThis(){
        this.props.remove(this.props.index);
    }
    
    render(){
        let class_tag = "letterjam-letter-";
        switch(this.props.id[0]){
            case "0":
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
                class_tag += "player-"+this.props.id[0];
                break;
            case "B":
                class_tag += "bonus";
                break;
            case "N":
                class_tag += "npc";
                break;
            default:
                class_tag += "error";
                break;
        }
        return (
            <div onClick={this.removeThis.bind(this)} 
                className={"letterjam-letter letterjam-letter-faceup letterjam-letter-clickable "+class_tag}>
                {this.props.letter}
            </div>
        );
    }
}

class ClueViewer extends Component {
    render() {
        let clues = this.props.gamedata.game.players[this.props.gamedata.user.uid].clues_received;
        
        let max_clue_length = Math.max(5,...clues.map(clue=>clue.length));
        let clue_header = Array(max_clue_length).fill(1).map((_,index)=><th key={index}>{index+1}</th>);
        let clue_rows = clues.map((clue,row_index)=>{
            let clue_row = clue.split('').map((letter,letter_index)=><td key={letter_index}>{/^\d$/.test(letter)?"?"+(parseInt(letter)+1):letter}</td>);
            return <tr key={row_index}><th>{row_index+1}</th>{clue_row}</tr>;
        });
        clue_rows.reverse();
        return(<div className="letterjam-clueviewer">
            <p>
            Clue History
            </p>
            <table>
            <thead>
            <tr><th></th>
            {clue_header}
            </tr>
            </thead>
            <tbody>
            {clue_rows}
            </tbody>
            </table>
            </div>);
    }
}

class ClueRetrospective extends Component {        
    render() {
        let clues = this.props.gamedata.game.clues;
        let max_clue_length = Math.max(5,...clues.map(clue=>(clue.length+1)/4));
        let clue_header = Array(max_clue_length).fill(1).map((_,index)=><th key={index}>{index+1}</th>);
        let clue_rows = clues.map((clue,row_index)=>{
            let clue_row = clue.split(' ').map((x,letter_index)=><td key={letter_index}>{x[2]}</td>);
            return <tr key={row_index}><th>{row_index+1}</th>{clue_row}</tr>;
        });
        return(<div className="letterjam-clueviewer">
            <p>
            Clues in the game:
            </p>
            <table>
            <thead>
            <tr><th></th>
            {clue_header}
            </tr>
            </thead>
            <tbody>
            {clue_rows}
            </tbody>
            </table>
            </div>);
    }
}
