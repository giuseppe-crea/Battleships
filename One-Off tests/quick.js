// ######################################################################

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
        var board_elem = {
            tile: i,
            ship: shipPresence
        }
        board.push(board_elem);
        console.log(board_elem);
    }

    // encode the leaves

    const leafNodes = board.map((_board) => 
        web3.utils.keccak256(web3.eth.abi.encodeParameters(['uint32','bool'],[_board.tile,_board.ship]))
    );
    console.log(leafNodes);
    /*
    const leafNodes = board.map((_board) =>
        keccak256(
            Buffer.concat([
                Buffer.from(_board.tile),
                Buffer.from(_board.ship.replace("0x", ""), "hex")
            ])
        )
    );
    */
    // generate the merkle tree
    const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
    // print
    /*
    console.log("---------");
    console.log("Merke Tree");
    console.log("---------");
    console.log(merkleTree.toString());
    console.log("---------");
    console.log("Merkle Root: " + merkleTree.getHexRoot());
    */
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
console.log(p1_leaf_nodes.length);


contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
    });
    describe("Learning to walk. Again.", async () => {
        it("Echo Bytes:", async () =>{
            const reply = await battleships.EchoBytes(p1_board_collection[1][0]);
            console.log(reply);
        })
        it("Echo Proof:", async () =>{
            const arr1 = p0_board_collection[2].getHexProof(p0_board_collection[1][0])
            const reply = await battleships.EchoProof(arr1);
            console.log(reply);
        })
    })
    describe("Learning to walk. Again.", async () => {    
        it("Let's see what the contract makes out of a node", async () =>{
            var randomNumberFirstShot = Math.floor(Math.random() * 64);
            const targetNode = p1_leaf_nodes[randomNumberFirstShot];
            const nodeProof = p1_board_collection[2].getHexProof(targetNode);
            console.log("Proof:\n"+nodeProof);
            const reply = await battleships.QuickCheck(targetNode, p1_board, nodeProof);
            console.log(reply.logs[0].args[3]);
        })
        it("Test if the contract can generate a leaf like the client can", async () =>{
            var randomNumberFirstShot = Math.floor(Math.random() * 64);
            const targetNode = p1_leaf_nodes[randomNumberFirstShot];
            const ship = p1_plain_board[randomNumberFirstShot].ship;
            const reply = await battleships.GenLeafNode(randomNumberFirstShot, ship);
            //console.log("Server Value: " + reply);
            const reply_two = await battleships.EchoBytes(targetNode);
            //console.log("Client Value: " + reply_two);
            assert.equal(reply, reply_two, "Client and Server cannot generate identical nodes.")
            //const reply_three = await battleships.PreviewLeafNode('1', ship);
            //console.log("Server works on the following bytes array: " + reply_three);
        })
    })
});