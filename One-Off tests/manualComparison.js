const config = require('../truffle-config.js');
const RPCurl = 'http://'+config.networks.development.host+":"+config.networks.development.port;
const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const Web3 = require("web3");
const web3 = new Web3(RPCurl);

const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'logs');
const filePath = path.join(dir, 'leafNodes.txt');
const ships = fs.readFileSync(path.join(dir, 'ships.txt'), 'utf-8').split(',');
console.log("");
console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
console.log("");
console.log("Loaded " + ships.length + " ships from file");
console.log(ships);
console.log("");
console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
console.log("");
const leafNodesImported = fs.readFileSync(filePath, 'utf-8').split(',');
console.log("Loaded " + leafNodesImported.length + " leaf nodes from file");
console.log(leafNodesImported);
//const proofs = fs.readFileSync(path.join(dir, 'proofs.txt'), 'utf-8').split(',');

function generatePlayerBoard(){
    let board = [];
    var j = 0;
    for(var i = 0; i < 64; i++){
        var board_elem = {
            tile: i,
            ship: ships[i]
        }
        board.push(board_elem);
    }

    const leafNodes = board.map((_board) => 
        web3.utils.keccak256(web3.eth.abi.encodeParameters(['uint8','bool'],[_board.tile,_board.ship]))
    );

    const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
    
    return [board, leafNodes, merkleTree];
}

const merkleStuff = generatePlayerBoard();
var j = 0;
console.log("");
console.log("+++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++++");
console.log("");
merkleStuff[1].forEach(element => {
    // see if that element is found in leafNodesImported
    if(leafNodesImported.includes(element)){
        console.log(j + ": Found " + element + " at index " + leafNodesImported.indexOf(element));
    } else {
        console.log(j + ": Not found " + element);
    }
    j++;
});