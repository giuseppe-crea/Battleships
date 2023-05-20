// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Battleships {
    enum GameStates{
        WAITING, 
        SETTING_STAKE, 
        ACCEPTING_PAYMENT,
        PLACING_SHIPS, 
        P0_FIRING,
        P1_CHECKING,
        P1_FIRING,
        P0_CHECKING,
        DONE,
        NONE
    }

    struct Board{
        bool valid;
        // N*N matrix of bits to store hits
        bool[8][8] shots;
        uint totalPieces;
    }

    struct Player{
        bool valid;
        bool hasPaidStake;
        address playerAddress;
        uint proposedStake;
        bytes32 boardTreeRoot;
        Board shots_board;
    }

    struct Game{
        bool valid;
        bool canPay;
        // host is always player[0]
        Player[2] players;
        GameStates state;
        uint decidedStake;
        // used for foul accusation, a foul is triggered after 5 blocks
        uint blockNumber;
        // player 0 or player 1
        // might turn it into address, we will see
        bool accuser;
        // whether or not this game should be in the public pool of joinable games
        bool privateGame;
    }

    mapping(uint => Game) private openGames;

    Game private gameTrampoline;
    Player private playerTrampoline;
    // used in generating UUIDs for the games
    // for now we are gonna use this as-is
    // start at 1 as 0 is used for a non-existing game
    // TODO: deal with it overflowing
    uint private gameCounter;
    uint private lastOpenGame;

    constructor() {
        gameCounter = 1;
        lastOpenGame = 1;
    }

    event ShareID(address _from, address _to, uint _gameID);
    event GameStart(uint _gameID, address _host, address _challenger);
    event SuggestedStake(uint _gameID, address _from, address _to, uint _stakeValue);
    event GamePayable(uint _gameID, address _host, address _challenger, uint _stakeValue);
    event StakePaid(uint _gameID, address _whoPaid);
    event AcceptingBoards(uint _gameID);

    error InvalidGameID();
    error NotInGame();
    error StakeAlreadyDeposited();
    error WrongStakeAmount(uint expectedStakeValue);

    // create a Game value, add it to openGames, populate the Player[0]
    function newGame(bool isPrivate) public {
        uint gameID = gameCounter;
        gameCounter++;
        Game storage game = gameTrampoline;
        Player storage host = playerTrampoline;
        host.playerAddress = msg.sender;
        host.valid = true;
        host.hasPaidStake = false;
        game.players[0] = host;
        game.state = GameStates.WAITING;
        game.privateGame = isPrivate;
        game.valid = true;
        game.canPay = false;
        openGames[gameID] = game;
        emit ShareID(address(this), msg.sender, gameID);
        return;
    }
    
    function joinGame(uint gameID) public {
        if(gameID == 0){
            // pick an unassigned game in sequential order
            gameID = lastOpenGame;
            while(gameID <= gameCounter){
                Game memory game = openGames[gameID];
                // ignore games with sender as host
                if(game.valid == true && game.state == GameStates.WAITING && game.players[0].playerAddress != msg.sender && !game.privateGame){
                    break;
                }
                gameID++;
            }
            // update the lastOpenGame counter no matter what
            lastOpenGame = gameID;
        }
        // if the game wasn't valid, throw an error
        assert(openGames[gameID].valid);
        // set msg sender as this game's player 2
        Player storage challenger = playerTrampoline;
        challenger.playerAddress = msg.sender;
        challenger.valid = true;
        challenger.hasPaidStake = false;
        openGames[gameID].players[1] = challenger;
        // update this game's status
        openGames[gameID].state = GameStates.SETTING_STAKE;
        // alert the players
        emit GameStart(gameID, openGames[gameID].players[0].playerAddress, msg.sender);
        return;
    }

    // fails when called on gameID of 0 (non-existing game)
    function getGamePosition (uint gameID) private view returns (Game memory){
        Game memory gameChecked;
        assert(gameID != 0);
        gameChecked = openGames[gameID];
        return gameChecked;
    }

    function checkGameState(uint gameID) public view returns (GameStates) {
        Game memory game = getGamePosition(gameID);
        if (game.valid){
            return game.state;
        }
        else 
            return(GameStates.NONE);
    }

    function checkGamePlayerOne(uint gameID) public view returns (address) {
        Game memory game = getGamePosition(gameID);
        if (game.valid && game.players[0].valid){
            return game.players[0].playerAddress;
        }
        else 
            return(address(0));
    }

    function checkGamePlayerTwo(uint gameID) public view returns (address) {
        Game memory game = getGamePosition(gameID);
        if (game.valid && game.players[1].valid){
            return game.players[1].playerAddress;
        }
        else 
            return(address(0));
    }

    // Function to propose and agree upon a stake between players
    function proposeStake(uint gameID, uint stakeValue) public{
        Game memory game = openGames[gameID];
        assert(game.valid);
        assert(game.state == GameStates.SETTING_STAKE);
        assert(game.players[0].playerAddress == msg.sender || game.players[1].playerAddress == msg.sender);
        // Check whether or not this player's opponent has already proposed a stake
        uint opponentIndex;
        uint stakerIndex;
        if(msg.sender == game.players[0].playerAddress){
            opponentIndex = 1;
            stakerIndex = 0;
        } else {
            opponentIndex = 0;
            stakerIndex = 1;
        }
        uint opponentStake = game.players[opponentIndex].proposedStake;
        // set this player's proposed stake to their message
        openGames[gameID].players[stakerIndex].proposedStake = stakeValue;
        // if the opponent has proposed a stake we check whether or not it equals the one proposed by us
        // 0 is not a valid stake
        if(opponentStake != 0 && opponentStake == stakeValue){
            openGames[gameID].decidedStake = stakeValue;
            openGames[gameID].state = GameStates.ACCEPTING_PAYMENT;
            emit GamePayable(gameID, game.players[0].playerAddress, game.players[1].playerAddress, stakeValue);
        }else{
            emit SuggestedStake(gameID, msg.sender, game.players[opponentIndex].playerAddress, stakeValue);
        }
        return;
    }

    function checkStakePlayerOne(uint gameID) public view returns (uint) {
        Game memory game = getGamePosition(gameID);
        if (game.valid && game.players[0].valid){
            return game.players[0].proposedStake;
        }
        else 
            return(0);
    }

    function checkStakePlayerTwo(uint gameID) public view returns (uint) {
        Game memory game = getGamePosition(gameID);
        if (game.valid && game.players[1].valid){
            return game.players[1].proposedStake;
        }
        else 
            return(0);
    }

    function checkStakeGame(uint gameID) public view returns (uint) {
        Game memory game = getGamePosition(gameID);
        if (game.valid && game.players[0].valid && game.players[1].valid)
            return game.decidedStake;
        else
            return(0);
    }
    
    // TODO: write unit tests for this
    function payStake(uint gameID) external payable {
        // make sure the game exists and has to be paid
        if(!(openGames[gameID].valid) || !(openGames[gameID].state == GameStates.ACCEPTING_PAYMENT))
            revert InvalidGameID();
        // make sure the sender is part of the game
        if(!(msg.sender == openGames[gameID].players[0].playerAddress) || !(msg.sender == openGames[gameID].players[1].playerAddress))
            revert NotInGame();
        // check that this user has not paid already
        if((msg.sender == openGames[gameID].players[0].playerAddress && openGames[gameID].players[0].hasPaidStake) ||
            (msg.sender == openGames[gameID].players[1].playerAddress && openGames[gameID].players[1].hasPaidStake))
            revert StakeAlreadyDeposited();
        // only accept payments for the exact amount owed
        if(msg.value != openGames[gameID].decidedStake)
            revert WrongStakeAmount(openGames[gameID].decidedStake);
        // now we check who the sender is
        uint senderIndex;
        uint challengerIndex;
        if(msg.sender == openGames[gameID].players[0].playerAddress){
            senderIndex = 0;
            challengerIndex = 1;
        }else{
            senderIndex = 1;
            challengerIndex = 0;
        }
        openGames[gameID].players[senderIndex].hasPaidStake = true;
        emit StakePaid(gameID, msg.sender);
        // if both players have paid the owed stake the game can move on to its next state
        if(openGames[gameID].players[challengerIndex].hasPaidStake){
            openGames[gameID].state = GameStates.PLACING_SHIPS;
            emit AcceptingBoards(gameID);
        }
    }

    function checkPaymentPlayerOne(uint gameID) public view returns (bool) {
        Game memory game = getGamePosition(gameID);
        if (game.valid && game.players[0].valid){
            return game.players[0].hasPaidStake;
        }
        else 
            return(false);
    }

    function checkPaymentPlayerTwo(uint gameID) public view returns (bool) {
        Game memory game = getGamePosition(gameID);
        if (game.valid && game.players[1].valid){
            return game.players[1].hasPaidStake;
        }
        else 
            return(false);
    }

    function checkGamePayable(uint gameID) public view returns (bool) {
        Game memory game = getGamePosition(gameID);
        if (game.valid && game.players[0].valid && game.players[1].valid)
            return game.canPay;
        else
            return(false);
    }
}