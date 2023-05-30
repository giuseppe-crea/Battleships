const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const Web3 = require("web3");

const web3 = new Web3();

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
    return keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[Number(12),true]));
}
