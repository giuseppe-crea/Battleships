// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Battleships {
        struct Board{
            bool valid;
            // N*N matrix of bits to store hits
            bool[8][8] shots;
            uint totalPieces;
        }

        struct Player{
            bool valid;
            address playerAddress;
            uint proposedStake;
            bytes32 boardTreeRoot;
            Board shots_board;
        }

        struct Game{
            bool valid;
            // host is always player[0]
            Player[2] players;
            // 0: waiting; 1: setting stake; 2: placing ships; 
            // 3: player[0] firing turn; 4: player[1] response turn; 
            // 5: player[1] firing turn; 6: player[0] response turn; 
            // 7: done; 8: doesn't exist
            uint state;
            // used for foul accusation, a foul is triggered after 5 blocks
            uint blockNumber;
            // player 0 or player 1
            // might turn it into address, we will see
            bool accuser;
            // not required: whether or not this game should be in the public pool of joinable games
            bool privateGame;
        }

    // define a set of games available to join and a set of games already full
    mapping(uint => Game) private openGames;
    mapping(uint => Game) private fullGames;
    Game private gameTrampoline;
    Player private playerTrampoline;
    // used in generating UUIDs for the games
    // for now we are gonna use this as-is
    // TODO: deal with it overflowing
    uint private gameCounter;

    constructor() {
        gameCounter = 0;
    }

    event ShareID(address _from, address _to, uint _id);

    // create a Game value, add it to openGames, populate the Player[0]
    function newGame(bool isPrivate) public {
        uint gameID = gameCounter;
        gameCounter++;
        Game storage game = gameTrampoline;
        Player storage host = playerTrampoline;
        host.playerAddress = msg.sender;
        host.valid = true;
        game.players[0] = host;
        game.state = 0;
        game.privateGame = isPrivate;
        game.valid = true;
        openGames[gameID] = game;
        emit ShareID(address(this), msg.sender, gameID);
        return;
    }

    function getGamePosition (uint gameID) private view returns (Game memory){
        Game memory gameChecked;
        if(openGames[gameID].valid){
            gameChecked = openGames[gameID];
        }
        else if(fullGames[gameID].valid){
             gameChecked = fullGames[gameID];
        }
        return gameChecked;
    }

    function checkGameState(uint gameID) public view returns (uint) {
        Game memory game = getGamePosition(gameID);
        if (game.valid){
            return game.state;
        }
        else 
            return(8);
    }

    function checkGamePlayerOne(uint gameID) public view returns (address) {
        Game memory game = getGamePosition(gameID);
        if (game.valid){
            return game.players[0].playerAddress;
        }
        else 
            return(address(0));
    }

    function checkGamePlayerTwo(uint gameID) public view returns (address) {
        Game memory game = getGamePosition(gameID);
        if (game.valid){
            return game.players[1].playerAddress;
        }
        else 
            return(address(0));
    }
}