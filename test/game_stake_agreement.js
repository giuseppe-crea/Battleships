const Battleships = artifacts.require("Battleships");

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
    });
    
    describe("Stake agreement procedure between two parties", async () => {
        it("Creating a game on accounts[0] and joining it via direct ID on accounts[1]", async () => {
            const newGame = await battleships.newGame(false, {from: accounts[0]});
            const gameID = newGame.logs[0].args[2];
            const reply = await battleships.joinGame(gameID, {from: accounts[1]});
            assert.equal(reply.logs[0].event, 'GameStart', "Event of type GameStart did not fire.");
            assert.equal(reply.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(reply.logs[0].args[1], accounts[0], "Event was emitted for the wrong host.");
            assert.equal(reply.logs[0].args[2], accounts[1], "Event was emitted for the wrong challenger.");
        });
        it("Proposing a stake on accounts[0] and making a counter proposal on accounts[1].", async () => {
            // accounts[0] is proposing a stake of 100
            const reply = await battleships.proposeStake(1, 100);
            assert.equal(reply.logs[0].event, 'SuggestedStake', "Event of type SuggestedStake did not fire.");
            assert.equal(reply.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(reply.logs[0].args[1], accounts[0], "Event was emitted for the wrong from.");
            assert.equal(reply.logs[0].args[2], accounts[1], "Event was emitted for the wrong to.");
        });
        it("Checking consistency of staked values after that action.", async () => {
            // making sure the game is still accepting stakes
            const req_one = await battleships.checkGameState(1);
            assert.equal(req_one, 1, "Game is not accepting stakes anymore!")
            // confirming player 1 stake
            const req_two = await battleships.checkStakePlayerOne(1);
            assert.equal(req_two, 100, "Player One's stake is not correct.")
            // confirming player 2 stake
            const req_three = await battleships.checkStakePlayerTwo(1);
            assert.equal(req_three, 0, "Player Two's stake is not correct.")
            // confirming game's stake
            const req_four = await battleships.checkStakeGame(1);
            assert.equal(req_four, 0, "Wrong stake value for the game.")
        });
        it("Counterstaking on challenger.", async () => {
            // counterstaking on player 2
            const req_four = await battleships.proposeStake(1, 110, {from: accounts[1]});
            assert.equal(req_four.logs[0].event, 'SuggestedStake', "Event of type SuggestedStake did not fire.");
            assert.equal(req_four.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(req_four.logs[0].args[1], accounts[1], "Event was emitted for the wrong from.");
            assert.equal(req_four.logs[0].args[2], accounts[0], "Event was emitted for the wrong to.");
        });
        it("Checking consistency of staked values after that action.", async () => {
            // making sure the game is still accepting stakes
            const req_five = await battleships.checkGameState(1);
            assert.equal(req_five, 1, "Game is not accepting stakes anymore!")
            // confirming player 1 stake
            const req_six = await battleships.checkStakePlayerOne(1);
            assert.equal(req_six, 100, "Player One's stake is not correct.")
            // confirming player 2 stake
            const req_seven = await battleships.checkStakePlayerTwo(1);
            assert.equal(req_seven, 110, "Player Two's stake is not correct.")
            // confirming game's stake
            const req_four = await battleships.checkStakeGame(1);
            assert.equal(req_four, 0, "Wrong stake value for the game.")
        });
        it("Finalizing a stake.", async () => {
            const reply = await battleships.proposeStake(1, 110);
            assert.equal(reply.logs[0].event, 'GamePayable', "Event of type GamePayable did not fire.");
            assert.equal(reply.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(reply.logs[0].args[1], accounts[0], "Event was emitted for the wrong from.");
            assert.equal(reply.logs[0].args[2], accounts[1], "Event was emitted for the wrong to.");
        });
        it("Checking consistency of staked values after that action.", async () => {
            // making sure the game is still accepting stakes
            const req_one = await battleships.checkGameState(1);
            assert.equal(req_one, 2, "Game is not ready to be paid!")
            // confirming player 1 stake
            const req_two = await battleships.checkStakePlayerOne(1);
            assert.equal(req_two, 110, "Player One's stake is not correct.")
            // confirming player 2 stake
            const req_three = await battleships.checkStakePlayerTwo(1);
            assert.equal(req_three, 110, "Player Two's stake is not correct.")
            // confirming game's stake
            const req_four = await battleships.checkStakeGame(1);
            assert.equal(req_four, 110, "Wrong stake value for the game.")
        });
    });
});