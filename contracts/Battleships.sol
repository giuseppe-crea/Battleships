// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Battlehsips {
        struct Board{
            // N*N matrix of bits to store hits
            bool[8][8] shots;
            uint totalPieces;
        }

        struct Player{
            address playerAddress;
            uint proposedStake;
            bytes32 boardTreeRoot;
            Board shots_board;
        }

        struct Game{
            // host is always player[0]
            Player[2] players;
            // 0: waiting; 1: setting stake; 2: placing ships; 
            // 3: player[0] firing turn; 4: player[1] response turn; 
            // 5: player[1] firing turn; 6: player[0] response turn; 7: done
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
}