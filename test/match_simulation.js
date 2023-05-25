// ######################################################################
// throw me some numbers

const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const Web3 = require("web3");

const web3 = new Web3();

// functions used in creating a new board for players.
function generateRandomNumbers(count) {
    var numbers = new Set();
    
    while (numbers.size < count) {
      var randomNumber = Math.floor(Math.random() * 64); // Generate a random number between 0 and 63
      numbers.add(randomNumber);
    }
    
    return Array.from(numbers);
  }
  function generatePlayerBoard(){
    // place 20 random ship pieces
    var shipsAt = generateRandomNumbers(20).sort(function(a, b) {
        return a - b;
    });
    // If we ever wanted to add a random value to each node, this would be the way
    //const randomUint32 = () => Math.floor(Math.random() * 4294967296);
    // create a board element
    let board = [];
    var j = 0;
    for(var i = 0; i < 64; i++){
        if(i == shipsAt[j] && j < 20){
            shipPresence = true;
            j++;
        }else{
            shipPresence = false;
        }
        // This implementation uses a random value for each node to ensure nobody can "guess" the whole board
        var board_elem = {
            tile: i,
            ship: shipPresence
        }
        board.push(board_elem);
    }

    // encode the leaves

    const leafNodes = board.map((_board) => 
        web3.utils.keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[_board.tile,_board.ship]))
    );

    const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
    
    return [board, leafNodes, merkleTree];
}

// ######################################################################
const Battleships = artifacts.require("Battleships");

// fuzzying tests! how fun!
const p0_board_collection = generatePlayerBoard();
const p1_board_collection = generatePlayerBoard();
// load the freshly computed boards
const plain_board = [p0_board_collection[0], p1_board_collection[0]];
const leaf_nodes =  [p0_board_collection[1], p1_board_collection[1]];
const board_root = [p0_board_collection[2].getHexRoot(), p1_board_collection[2].getHexRoot()];
const merkle_tree_objects = [p0_board_collection[2], p1_board_collection[2]];
// pre-gen the tiles both players will call
const tiles_p1 = generateRandomNumbers(64);
const tiles_p2 = generateRandomNumbers(64);
const target_tile = [tiles_p1, tiles_p2];
var winnerIndex;

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
        await battleships.newGame(false, {from: accounts[0]});
        await battleships.joinGame(1, {from: accounts[1]});
        await battleships.proposeStake(1, 5000);
        await battleships.proposeStake(1, 5000, {from: accounts[1]});
        await battleships.payStake(1, {value: 5000});
        await battleships.payStake(1, {from: accounts[1], value: 5000});
        await battleships.PlaceShips(1, board_root[0]);
        await battleships.PlaceShips(1, board_root[1], {from: accounts[1]});
    });
    describe("Let's try looping between send and check until one of the two players wins!", async () =>{
        it("Playing the game...", async () =>{
            var p1 = 0;
            var p2 = 1;
            var turn_number = 0;
            var round_number = 0;
            var reply;
            var winner;
            do{
                //console.log("Round " + round_number + ", turn "+ turn_number + ".");
                // one player fires
                //console.log("Firing from player "+ p1 +" onto tile "+ target_tile[p1][round_number]+".");
                reply = await battleships.FireTorpedo(1, target_tile[p1][round_number], {from:accounts[p1]});
                if(reply.logs[0].event == 'RequestBoard') break;
                // the other player responds
                var shipPresence = plain_board[p2][target_tile[p1][round_number]].ship;
                var targetNode = leaf_nodes[p2][target_tile[p1][round_number]];
                var nodeProof = merkle_tree_objects[p2].getHexProof(targetNode);
                //console.log("Checking the shot from player "+ p2 +" for expected value of "+ shipPresence+".");
                reply = await battleships.ConfirmShot(1, target_tile[p1][round_number], shipPresence, targetNode, nodeProof, {from: accounts[p2]})
                if(reply.logs[0].event == 'RequestBoard') break;
                // swap roles
                p1 = 1 - p1;
                p2 = 1 - p2;
                turn_number++;
                round_number = Math.floor(turn_number/2);
                process.stdout.write(".");
            }while(turn_number < 128)
            if(reply.logs[0].args[1] == accounts[0]){
                winner = 'accounts[0]';
                winnerIndex = 0;
            } else if(reply.logs[0].args[1] == accounts[1]){
                winner = 'accounts[1]';
                winnerIndex = 1;
            } else {
                assert(false, "Winner address didn't match. Value was " + reply.logs[0].args[1]);
            }
            console.log("");
            console.log("Congratz, someone actually won! It was "+ winner + ", address " + accounts[winnerIndex]);
        })
        it("Winning player attempts to validate their board.", async () => {
            let tiles = [];
            let ships = [];
            plain_board[winnerIndex].forEach(element => {
                tiles.push(element.tile);
                ships.push(element.ship)
            });
            let proofs = [];
            leaf_nodes[winnerIndex].forEach(element => {
                proofs.push(merkle_tree_objects[winnerIndex].getHexProof(element))
            });        
            /*  
            console.log(tiles);
            console.log(ships);
            console.log(proofs);
            console.log(leaf_nodes[winnerIndex]);
            console.log(board_root[winnerIndex]);
            */
            const reply = await battleships.VerifyWinner(1, tiles, ships, leaf_nodes[winnerIndex], proofs, board_root[winnerIndex], {from:accounts[winnerIndex]});
            assert.equal(reply.logs[0].event, 'Victory', "Event of type Victory did not fire.");
        })
    })
});