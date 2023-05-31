const config = require('../truffle-config.js');
const RPCurl = 'http://'+config.networks.development.host+":"+config.networks.development.port;
const Battleships = artifacts.require("Battleships");
const correctString = '0x00000000000000000000000000000000000000000000000000000000000000340000000000000000000000000000000000000000000000000000000000000001';
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const Web3 = require("web3");

const web3 = new Web3(RPCurl);

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
function quickTest() {    
    console.log(web3.eth.abi.encodeParameters(['uint8','bool'],[Number(52),true]));
    console.log(keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[Number(52),true])));
    console.log("Now for the real deal");
    console.log("Lenght: " + correctString.length);
    console.log(correctString)
    console.log(keccak256(correctString));
    console.log("Lenght: " + keccak256(correctString).length);
}

quickTest();
contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
    });
    describe("What does the contract say?", async () => {
        it("Echoing the node bytes...", async () =>{
            const shippedValue = keccak256(correctString);
            console.log("We are sending value " + shippedValue.toString('hex') + " of length " + shippedValue.length);
            const reply = await battleships.echoNodeBytes(shippedValue);
            console.log("The server saw " + reply);
        })
    });
});