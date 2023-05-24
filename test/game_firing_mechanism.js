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
const p0_plain_board = p0_board_collection[0];
const p0_leaf_nodes =  p0_board_collection[1];
const p0_board = p0_board_collection[2].getHexRoot();
const p1_plain_board = p1_board_collection[0];
const p1_leaf_nodes =  p1_board_collection[1];
const p1_board = p1_board_collection[2].getHexRoot();
var randomNumberFirstShot = Math.floor(Math.random() * 64);
var randomNumberSecondShot = Math.floor(Math.random() * 64);

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
        await battleships.PlaceShips(1, p0_board);
        await battleships.PlaceShips(1, p1_board, {from: accounts[1]});
        
    });
   
    describe("Positive tests", async () =>{
        
        it("Assert correct setup:", async () =>{
            const reply = await battleships.checkGameState(1);
            assert.equal(reply, 4, "Failed Setup");
        })
        it("Firing a shot from player 1.", async () =>{
            // shoot at a random number
            const reply = await battleships.FireTorpedo(1, randomNumberFirstShot);
            assert.equal(reply.logs[0].event, 'ShotsFired', "Event of type ShotsFired did not fire.");
            const status = await battleships.checkGameState(1);
            assert.equal(status, 5, "State machine failed 1.");
        })
        it("Checking the shot from player 2.", async () =>{
            const shipPresence = p1_plain_board[randomNumberFirstShot].ship;
            const targetNode = p1_leaf_nodes[randomNumberFirstShot];
            const nodeProof = p1_board_collection[2].getHexProof(targetNode);
            console.log("Checking shot on board piece " + randomNumberFirstShot + " of player 2 with expected result of " + shipPresence);
            const reply = await battleships.ConfirmShot(1, randomNumberFirstShot, shipPresence, targetNode, nodeProof, {from: accounts[1]})
            assert.equal(reply.logs[0].event, 'ShotsChecked', "Event of type ShotsChecked did not fire.");
            assert(reply.logs[0].args[3], "The shot failed to validate!")
            const status = await battleships.checkGameState(1);
            assert.equal(status, 6, "State machine failed 2.");
        })
        it("Firing a shot from player 2.", async () =>{
            // shoot at a random number
            const reply = await battleships.FireTorpedo(1, randomNumberSecondShot, {from:accounts[1]});
            assert.equal(reply.logs[0].event, 'ShotsFired', "Event of type ShotsFired did not fire.");
            const status = await battleships.checkGameState(1);
            assert.equal(status, 7, "State machine failed 1.");
        })
        it("Checking the shot from player 1.", async () =>{
            const shipPresence = p0_plain_board[randomNumberSecondShot].ship;
            const targetNode = p0_leaf_nodes[randomNumberSecondShot];
            const nodeProof = p0_board_collection[2].getHexProof(targetNode);
            console.log("Checking shot on board piece " + randomNumberSecondShot + " of player 1 with expected result of " + shipPresence);
            const reply = await battleships.ConfirmShot(1, randomNumberSecondShot, shipPresence, targetNode, nodeProof)
            assert.equal(reply.logs[0].event, 'ShotsChecked', "Event of type ShotsChecked did not fire.");
            assert(reply.logs[0].args[3], "The shot failed to validate!")
            const status = await battleships.checkGameState(1);
            assert.equal(status, 4, "State machine failed 2.");
        })
    });
});


