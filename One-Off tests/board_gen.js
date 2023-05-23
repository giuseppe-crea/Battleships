const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const Web3 = require("web3");

const web3 = new Web3();

let board = [
    {
        tile: "12",
        ship: web3.eth.abi.encodeParameter(
            "bool",
            "false"
        )
    },
    {
        tile: "24",
        ship: web3.eth.abi.encodeParameter(
            "bool",
            "true"
        )
    }
];

const leafNodes = board.map((_board) =>
    keccak256(
        Buffer.concat([
            Buffer.from(_board.tile),
            Buffer.from(_board.ship.replace("0x", ""), "hex")
        ])
    )
);

const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});

function CreateNodes(board){
    const leafNodes = board.map((_board) =>
        keccak256(
            Buffer.concat([
                Buffer.from(_board.tile),
                Buffer.from(_board.ship.replace("0x", ""), "hex")
            ])
        )
    );
    return leafNodes;
}

function CreateTree(board){
    const leafNodes = CreateNodes(board);
    const merkleTree = new MerkleTree(leafNodes, keccak256, {sortPairs: true});
    return merkleTree;
}

export function GetTree(board){
    return CreateTree(board);
}

console.log("---------");
console.log("Merke Tree");
console.log("---------");
console.log(merkleTree.toString());
console.log("---------");
console.log("Merkle Root: " + merkleTree.getHexRoot());

console.log("Proof 1: " + merkleTree.getHexProof(leafNodes[0]));
console.log("Proof 2: " + merkleTree.getHexProof(leafNodes[1]));