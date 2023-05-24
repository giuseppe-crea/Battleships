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
        // a bit of cheating
        await battleships.ChangeState(1, Battleships.GameStates.CHECKING_WINNER);
        await battleships.SetWinner(1, accounts[0]);
    });
    describe("Positive tests", async () =>{
        it("Assert correct setup:", async () =>{
            const reply = await battleships.checkGameState(1);
            assert.equal(reply, Battleships.GameStates.CHECKING_WINNER, "Failed Setup");
        })
        it("Call VerifyWinner.", async () =>{
            let tiles = [];
            let ships = [];
            p0_plain_board.forEach(element => {
                tiles.push(element.tile);
                ships.push(element.ship)
            });
            let proofs = [];
            p0_leaf_nodes.forEach(element => {
                proofs.push(p0_board_collection[2].getHexProof(element))
            });          
            const reply = await battleships.VerifyWinner(1, tiles, ships, p0_leaf_nodes, proofs, p0_board);
            assert.equal(reply.logs[0].event, 'Victory', "Event of type Victory did not fire.");
        })
    });
});