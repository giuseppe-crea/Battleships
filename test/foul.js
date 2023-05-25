// ######################################################################
// throw me some numbers

const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const rpcURL = 'http://127.0.0.1:7545'
const Web3 = require("web3");

const web3 = new Web3(rpcURL);

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
advanceBlock = () => {
    return new Promise((resolve, reject) => {
      web3.currentProvider.send({
        jsonrpc: '2.0',
        method: 'evm_mine',
        id: new Date().getTime()
      }, (err, result) => {
        if (err) { return reject(err) }
        const newBlockHash = web3.eth.getBlock('latest').hash
  
        return resolve(newBlockHash)
      })
    })
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
const stakeValue = 5000;
var winnerIndex;
var gameID;
var p1 = 0;
var p2 = 1;

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
    });
    describe("Positive tests", async () => {
        beforeEach("Instantiate a new game.", async () => {
            var newGame = await battleships.newGame(false, {from: accounts[0]});
            gameID = Number(newGame.logs[0].args[2]);
            await battleships.joinGame(gameID, {from: accounts[1]});
            try{
                await battleships.PlaceShips(gameID, board_root[0]);
            } catch (error){
                console.log(error);
            }
            await battleships.PlaceShips(gameID, board_root[1], {from: accounts[1]});
            await battleships.proposeStake(gameID, stakeValue);
            await battleships.proposeStake(gameID, stakeValue, {from: accounts[1]});
        })
        afterEach("Trigger and resolve a foul.", async () =>{
            const one = await battleships.FoulAccusation(gameID, {from:accounts[p1]});  
            assert.equal(one.logs[0].event, 'Foul', "Event of type Foul did not fire.")
            assert.equal(one.logs[0].args[0], gameID, "Event was emitted for the wrong gameID.");
            assert.equal(one.logs[0].args[1], accounts[p2], "Event was emitted for the wrong from.");
            console.log("Foul Event emitted for block number: " + one.logs[0].args[2])
            for(var i = 0; i < 6; i++){
                await advanceBlock;
            }
            const two = await battleships.CheckFoulTimer(gameID, {from:accounts[p1]});
            assert.equal(two.logs[0].event, 'RequestBoard', "Event of type RequestBoard did not fire.")
            assert.equal(two.logs[0].args[0], gameID, "Event was emitted for the wrong gameID.");
            assert.equal(two.logs[0].args[1], accounts[p1], "Event was emitted for the wrong from.");
            const three = await battleships.checkGameState(gameID);
            assert.equal(three, Battleships.GameStates.CHECKING_WINNER);
        })
        it("Foul during ACCEPTING_PAYMENT from P0", async () => {
            p1 = 0;
            p2 = 1;
            await battleships.payStake(gameID, {value: stakeValue});     
        })
        it("Foul during ACCEPTING_PAYMENT from P1", async () => {
            p1 = 1;
            p2 = 0;
            await battleships.payStake(gameID, {from: accounts[p1], value: stakeValue});
        })
        it("Foul during P0_FIRING from P0", async () => {
            p1 = 1;
            p2 = 0;
            await battleships.payStake(gameID, {value: stakeValue});
            await battleships.payStake(gameID, {from: accounts[1], value: stakeValue});
            const one = await battleships.checkGameState(gameID);
            assert.equal(one, Battleships.GameStates.P0_FIRING);
        })
        it("Foul during P1_FIRING from P1", async () => {
            p1 = 0;
            p2 = 1;
            await battleships.payStake(gameID, {value: stakeValue});
            await battleships.payStake(gameID, {from: accounts[1], value: stakeValue});
            // play one round 
            await battleships.FireTorpedo(gameID, target_tile[p1][0], {from:accounts[p1]});
            var shipPresence = plain_board[p2][target_tile[p1][0]].ship;
            var targetNode = leaf_nodes[p2][target_tile[p1][0]];
            var nodeProof = merkle_tree_objects[p2].getHexProof(targetNode);
            await battleships.ConfirmShot(gameID, target_tile[p1][0], shipPresence, targetNode, nodeProof, {from: accounts[p2]})
            // confirm we are in P1_FIRING
            const one = await battleships.checkGameState(gameID);
            assert.equal(one, Battleships.GameStates.P1_FIRING);
        })
        it("Foul during P0_CHECKING from P0", async () => {
            p1 = 0;
            p2 = 1;
            await battleships.payStake(gameID, {value: stakeValue});
            await battleships.payStake(gameID, {from: accounts[1], value: stakeValue});
            // play one round 
            await battleships.FireTorpedo(gameID, target_tile[p1][0], {from:accounts[p1]});
            var shipPresence = plain_board[p2][target_tile[p1][0]].ship;
            var targetNode = leaf_nodes[p2][target_tile[p1][0]];
            var nodeProof = merkle_tree_objects[p2].getHexProof(targetNode);
            await battleships.ConfirmShot(gameID, target_tile[p1][0], shipPresence, targetNode, nodeProof, {from: accounts[p2]})
            // start second round
            p1 = 1;
            p2 = 0;
            await battleships.FireTorpedo(gameID, target_tile[p1][0], {from:accounts[p1]});
            // confirm we are in P0_CHECKING
            const one = await battleships.checkGameState(gameID);
            assert.equal(one, Battleships.GameStates.P0_CHECKING);
        })
        it("Foul during P1_CHECKING from P1", async () => {
            p1 = 0;
            p2 = 1;
            await battleships.payStake(gameID, {value: stakeValue});
            await battleships.payStake(gameID, {from: accounts[1], value: stakeValue});
            // play one round 
            await battleships.FireTorpedo(gameID, target_tile[p1][0], {from:accounts[p1]});
            // confirm we are in P1_CHECKING
            const one = await battleships.checkGameState(gameID);
            assert.equal(one, Battleships.GameStates.P1_CHECKING);
        })
        it("Foul during CHECKING_WINNER from P0", async () => {
            p1 = 1;
            p2 = 0;
            await battleships.payStake(gameID, {value: stakeValue});
            await battleships.payStake(gameID, {from: accounts[1], value: stakeValue});
            await battleships.ChangeState(gameID, Battleships.GameStates.CHECKING_WINNER);
            await battleships.SetWinner(gameID, accounts[p2]);
            const one = await battleships.checkGameState(gameID);
            assert.equal(one, Battleships.GameStates.CHECKING_WINNER);
        })
        it("Foul during CHECKING_WINNER from P1", async () => {
            p1 = 0;
            p2 = 1;
            await battleships.payStake(gameID, {value: stakeValue});
            await battleships.payStake(gameID, {from: accounts[1], value: stakeValue});
            await battleships.ChangeState(gameID, Battleships.GameStates.CHECKING_WINNER);
            await battleships.SetWinner(gameID, accounts[p2]);
            const one = await battleships.checkGameState(gameID);
            assert.equal(one, Battleships.GameStates.CHECKING_WINNER);
        })
    })
});