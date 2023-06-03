// ######################################################################
// throw me some numbers
const config = require('../truffle-config.js');
const RPCurl = 'http://'+config.networks.development.host+":"+config.networks.development.port;

const keccak256 = require("keccak256");
const { MerkleTree } = require("merkletreejs");
const Web3 = require("web3");

const web3 = new Web3(RPCurl);

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
const stakeValue = 1;
var winnerIndex;
var totalGasUsed = 0;
var totalGasLoop = 0;
var totalGasCoda = 0;
var tmpReply;

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
        battleships = await Battleships.deployed();
        tmpReply = await battleships.newGame(false, {from: accounts[0]});
        totalGasUsed += tmpReply.receipt.gasUsed;
        console.log("Gas used for newGame: " + tmpReply.receipt.gasUsed);
        tmpReply = await battleships.joinGame(1, {from: accounts[1]});
        console.log("Gas used for joinGame: " + tmpReply.receipt.gasUsed);
        tmpReply = await battleships.PlaceShips(1, board_root[0]);
        console.log("Gas used for PlaceShips: " + tmpReply.receipt.gasUsed);
        totalGasUsed += tmpReply.receipt.gasUsed;
        await battleships.PlaceShips(1, board_root[1], {from: accounts[1]});
        tmpReply = await battleships.proposeStake(1, stakeValue);
        console.log("Gas used for proposeStake: " + tmpReply.receipt.gasUsed);
        totalGasUsed += tmpReply.receipt.gasUsed;
        await battleships.proposeStake(1, stakeValue, {from: accounts[1]});
        tmpReply = await battleships.payStake(1, {value: stakeValue});
        console.log("Gas used for payStake: " + tmpReply.receipt.gasUsed);
        totalGasUsed += tmpReply.receipt.gasUsed;
        await battleships.payStake(1, {from: accounts[1], value: stakeValue});
    });
    describe("Let's try looping between send and check until one of the two players wins!", async () =>{
        it("Playing the game...", async () =>{
            var p1 = 0;
            var p2 = 1;
            var turn_number = 0;
            var round_number = 0;
            var reply;
            var winner;
            var gasShot;
            var gasCheck;
            do{
                //console.log("Round " + round_number + ", turn "+ turn_number + ".");
                // one player fires
                //console.log("Firing from player "+ p1 +" onto tile "+ target_tile[p1][round_number]+".");
                reply = await battleships.FireTorpedo(1, target_tile[p1][round_number], {from:accounts[p1]});
                gasShot = reply.receipt.gasUsed;
                totalGasLoop += reply.receipt.gasUsed;
                if(reply.logs[0].event == 'RequestBoard') break;
                // the other player responds
                var shipPresence = plain_board[p2][target_tile[p1][round_number]].ship;
                var targetNode = leaf_nodes[p2][target_tile[p1][round_number]];
                var nodeProof = merkle_tree_objects[p2].getHexProof(targetNode);
                //console.log("Checking the shot from player "+ p2 +" for expected value of "+ shipPresence+".");
                reply = await battleships.ConfirmShot(1, target_tile[p1][round_number], shipPresence, targetNode, nodeProof, {from: accounts[p2]})
                gasCheck = reply.receipt.gasUsed;
                totalGasLoop += reply.receipt.gasUsed;
                if(reply.logs[0].event == 'RequestBoard') break;
                // swap roles
                p1 = 1 - p1;
                p2 = 1 - p2;
                turn_number++;
                round_number = Math.floor(turn_number/2);
                process.stdout.write(".");
            }while(turn_number < 300) // there is absolutely no reason this should take more than 123 turns, as the target_tiles arrays contain no repeats
            if(reply.logs[0].args[1] == accounts[0]){
                winner = 'accounts[0]';
                winnerIndex = 0;
            } else if(reply.logs[0].args[1] == accounts[1]){
                winner = 'accounts[1]';
                winnerIndex = 1;
            } else {
                assert(false, "Winner address didn't match either player. Value was " + reply.logs[0].args[1]);
            }
            console.log("");
            console.log("Congratz, someone actually won! It was "+ winner + ", address " + accounts[winnerIndex]);
            totalGasLoop = Math.floor(totalGasLoop/turn_number);
            console.log("Gas used for a single fireTorpedo: " + gasShot);
            console.log("Gas used for a single confirmShot: " + gasCheck);
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
            const reply = await battleships.VerifyWinner(1, tiles, ships, leaf_nodes[winnerIndex], proofs, board_root[winnerIndex], {from:accounts[winnerIndex]});
            assert.equal(reply.logs[0].event, 'Victory', "Event of type Victory did not fire.");
            totalGasCoda += reply.receipt.gasUsed;
            console.log("Gas used for VerifyWinner: " + reply.receipt.gasUsed);
            const reply_two = await battleships.checkGameState(1);
            assert.equal(reply_two, Battleships.GameStates.PAYABLE, "Contract not payable.");
        })
        it("Winning player attempts to withdraw winnings.", async () =>{
            
            let expectedBalance = await web3.eth.getBalance(accounts[winnerIndex]);
            const a = BigInt(expectedBalance);

            const reply = await battleships.WithdrawWinnings(1, {from:accounts[winnerIndex]});
            const gasWithdrawal = reply.receipt.gasUsed;
            console.log("Gas used for WithdrawWinnings: " + gasWithdrawal);
            totalGasCoda += gasWithdrawal;
            
            let actualBalance = await web3.eth.getBalance(accounts[winnerIndex]);
            const b = BigInt(actualBalance);

            const reply_two = await battleships.checkGameState(1, {from:accounts[3]});
            assert.equal(reply_two, Battleships.GameStates.NONE, "Contract not done, game still exists.");

            const cost_one = gasWithdrawal * reply.receipt.effectiveGasPrice;
            const cost = BigInt(cost_one);

            const winnings = BigInt(stakeValue) * BigInt(2);
            assert((a === (b + cost - winnings)), "The correct amount was deposited in the winner's wallet.");
            console.log("Total gas used for setup: "+totalGasUsed);
            console.log("Average gas used for a single turn: "+ totalGasLoop);
            totalGasLoop = totalGasLoop*64;
            console.log("Projected gas usage for a 64-turns game: " + totalGasLoop);
            console.log("Gas used for the outro sequence: "+totalGasCoda);
            totalGasUsed += totalGasLoop + totalGasCoda;
            console.log("Total gas used for an hypothetical 64 moves game from a single player: " + totalGasUsed);
        })
    })
});