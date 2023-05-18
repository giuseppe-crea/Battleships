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

    event ShareID(address _from, address _to, uint _id);
    event GameStart(uint _id, address _host, address _challenger);

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

    // fails when called on gameID of 0 (non-existing game)
    function getGamePosition (uint gameID) private view returns (Game memory){
        Game memory gameChecked;
        assert(gameID != 0);
        gameChecked = openGames[gameID];
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

    function joinGame(uint gameID) public {
        if(gameID == 0){
            // pick an unassigned game in sequential order
            gameID = lastOpenGame;
            while(gameID <= gameCounter){
                Game memory game = openGames[gameID];
                // ignore games with sender as host
                if(game.valid == true && game.state == 0 && game.players[0].playerAddress != msg.sender && !game.privateGame){
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
        openGames[gameID].players[1] = challenger;
        // update this game's status
        openGames[gameID].state = 1;
        // alert the players
        emit GameStart(gameID, openGames[gameID].players[0].playerAddress, msg.sender);
        return;
    }
}