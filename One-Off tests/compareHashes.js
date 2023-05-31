const config = require('../truffle-config.js');
const RPCurl = 'http://'+config.networks.development.host+":"+config.networks.development.port;
const Battleships = artifacts.require("Battleships");
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const Web3 = require("web3");
var ones = [];
var twos = [];
var results = [];
const web3 = new Web3(RPCurl);

function generateRandomNumbers(count, max) {
    var numbers = [];
    
    for(var i = 0; i < count; i++) {
      var randomNumber = Math.floor(Math.random() * max); // Generate a random number between 0 and 63
      numbers.push(randomNumber);
    }
    return numbers;
}

var tiles = generateRandomNumbers(64, 64);
var ships = generateRandomNumbers(64, 2);
var boolships = ships.map((ship) => ship === 1 ? true : false);
/*
let board = [];
let leafNodes = [];
letcomputedTree = null;
let board_root = 0x0;
// function to generate the merkle trie from the ships array
function generatePlayerBoard(bool_board){
    // from the already filled board we generate the merkle trie
    for(var i = 0; i < 64; i++){
        // This implementation uses a random value for each node to ensure nobody can "guess" the whole board
        var board_elem = {
            tile: i,
            ship: bool_board[i]
        }
        board.push(board_elem);
    }
    leafNodes = this.board.map((_board) => 
        keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[_board.tile,_board.ship]))
    );
    computedTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
    board_root = computedTree.getHexRoot();
}
*/

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
    });
    describe("Testing whether the hand-encoded string hashes to the same value as the abi-encoded string.", async () => {
        it("Echoing the node bytes...", async () =>{
            for(var i = 0; i < ships.length; i++){
                var tile = tiles[i];
                var ship = ships[i];
                var hexString = Number(tile).toString(16).padStart(64, '0');
                var hexString2 = ship.toString(16).padStart(64, '0');
                var hexString3 = '0x' + hexString + hexString2;
                var shippedValue = keccak256(hexString3);
                var result = await battleships.echoNodeBytes(shippedValue);
                ones.push(result);
            }
        })
        it("Doing it again for the same values encoded with the abi.", async () =>{
            for(var i = 0; i < ships.length; i++){
                var tile = tiles[i];
                var ship = boolships[i];
                const shippedValue =  keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[Number(tile), ship]));
                var result = await battleships.echoNodeBytes(shippedValue);
                twos.push(result);
            }
        })
        it("Make sure the replies were identical", async () =>{
            results = [ones, twos];
            for(var i = 0; i < ships.length; i++){
                var one = results[0][i];
                var two = results[1][i];
                // console.log("The contract saw " + one + " and " + two);
                assert.equal(one, two, "The contract did not echo the same value for both nodes.");
            }
        })
    })
});