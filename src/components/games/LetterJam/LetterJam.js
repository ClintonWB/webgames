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
        <>
            <div className="WhoSaidWhat game">
            <h2> Letter Jam </h2>  
            <h3> A game of spelling words that do not have the letters J,Q,V,X, or Z in them.</h3>              
                {
                !game.started?
                <LetterJamSetup gamedata={this.props.gamedata}/>
                :
                <LetterJamPlay gamedata={this.props.gamedata}/>
                }
            </div>
        
        
        <button onClick={this.endGame.bind(this)}>End Game </button>
        </>
        
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
                letter_guesses:["?","?","?","?","?"],
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
        let uid = this.props.gamedata.user.uid;
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
    
    render() {
        return (
        <>
        <div>
        Round {this.props.gamedata.game.round+1}
        </div>
        <div>
        <PlayersDisplay gamedata={this.props.gamedata} addCard={this.appendToProposal.bind(this)}/>
        <ClueHelperSelector gamedata={this.props.gamedata}/>
        <ProposalBuilder gamedata={this.props.gamedata} proposal={this.state.proposal} remove={this.removeFromProposal.bind(this)}/>
        <ClueViewer gamedata={this.props.gamedata} />
        </div>
        </>
        
        );
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
        
        let npc_panels = game.npcs.map((npc,index) => <div className="letterjam-npcpanel letterjam-characterpanel" key={index}>
        <SelectableCard id={"N"+index+npc.current_letter} addCard={this.props.addCard} letter={npc.current_letter}/>
         <div> NPC needs {npc.remaining_cards} clues. </div>
        </div>);
        let bonus_letters = game.bonus_letters.map((letter,index) => 
            <SelectableCard key={index} addCard={this.props.addCard} id={"B"+index+letter} letter={letter}/>
        );
        return (
        <>
        <p>
        Players:
        </p>
        <div>
        {player_panels}
        </div>
        <p>
        NPCs:
        </p>
        {npc_panels}
        <div className="letterjam-wildcard-block">
        <p>
        Wild Card:
        </p>
        <SelectableCard addCard={this.props.addCard} id={"***"} letter={"*"}/>
        </div>
        {bonus_letters.length>0?
        <div className="letterjam-bonusletter-block">
        <p>
        Bonus Letters:
        </p> 
        {bonus_letters}
        </div>
        :<></>}
        </>
        
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
        
        console.log(game);
        
        this.props.gamedata.room_ref.update({
            game: game,
        });
    }
    
    render() {
        var game = this.props.gamedata.game;
        var target_player = this.props.gamedata.game.players[this.props.uid];
        var is_me = (this.props.uid === this.props.gamedata.user.uid);
        
        var display_row = target_player.target_letters.map((letter,position)=>
                <div key={position} className={"letterjam-letter letterjam-letter-facedown letterjam-letter-player-"+this.props.index}>_</div>);
        
        if(is_me){
            display_row[target_player.letter_position]=<div 
                        key={target_player.letter_position} 
                        className={"letterjam-letter letterjam-letter-faceup letterjam-letter-mystery letterjam-letter-player-"+this.props.index}
                        >?</div>;
        } else {
            display_row[target_player.letter_position]=<SelectableCard
                        addCard={this.props.addCard}
                        key={target_player.letter_position}
                        id={"".concat(this.props.index,target_player.letter_position,target_player.current_letter)}
                        letter={target_player.current_letter}/>

        }
                
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
        
        
        // Common Setup
        return (<>
        <div className="letterjam-playerpanel letterjam-characterpanel">
        <div className="letterjam-playerpanel-name">
        {this.props.gamedata.people[this.props.uid]}
        </div>
        <div className="letterjam-playerpanel-word">
        {display_row}
        </div>
        <div className="letterjam-advance-block">
            <>
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
        this.state = {
            letter_position:player.letter_position,
            max_letter_position:player.letter_position,
        }
    }
    
    
    static getDerivedStateFromProps(props, state){
        let uid = props.gamedata.user.uid;
        let player =  props.gamedata.game.players[uid];
        if(state.max_letter_position !== player.letter_position){
            state = {
                letter_position:player.letter_position,
                max_letter_position:player.letter_position,
            }
        } 
        return state;
    }
    
    switchToTab(event){
        let new_tab = parseInt(event.target.getAttribute("number"));
        console.log(new_tab);
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
        
        return(
        <div className="letterjam-cluehelper-selector">
        <div className="letterjam-cluehelper-selector-bar">
        {tabs}
        </div>
        <ClueHelper gamedata={this.props.gamedata} key={this.state.letter_position} letter_position={this.state.letter_position}/>
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
            guess:this.props.letter_guesses || "",
        }
    }
    
    advancePlayer(event){
        let game = this.props.gamedata.game;
        let uid = this.props.gamedata.user.uid;
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
        if(this.state.bonus_guess.toUpperCase() === game.players[uid].current_letter){
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
    
    render(){
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
        <p>
        Clue Helper
        </p>
        <table>
        <tbody>
            {clue_rows}
            </tbody>
        </table>
        <input className="letterjam-cluehelper-guess" onChange={this.updateGuess.bind(this)} defaultValue={this.state.guess} maxLength="1"></input>
        {target_player.can_move_on && this.props.letter_position === target_player.letter_position?
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
            <div>
            <p>
            Proposal Builder
            </p>
            <div>
            {proposal_cards}
            </div>
            <ProposalAnalysis proposal={this.props.proposal}/>
            <button onClick={this.submitProposal.bind(this)}>Propose Clue</button>
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
            Clue Viewer
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