const Battleships = artifacts.require("Battleships");

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
        const reply = await battleships.checkGameState(1);
        assert.equal(reply, 3, "Failed Setup");
    });
    describe("Correct Placement tests.", async () =>{
        it("Player #0 posts their board.", async () =>{
            // check that p0 board doesn't exist
            const one = await battleships.getPlayerOneBoardRoot(1);
            assert.equal(one, 0x0, "Player #0 already had a board.");
            // check that p0's shots board doesn't exist
            const two = await battleships.getPlayerOneShotsBoard(1);
            assert.equal(two, false, "Player #0 already had a shots board.");
            // post a board
            const p0_board = '0x0000000000000000000000000000000000000000000000000000000000000001';
            const three = await battleships.PlaceShips(1, p0_board);
            assert.equal(three.logs[0].event, 'BoardAcknowledgeEvent', "Event of type SuggestedStake did not fire.");
            assert.equal(three.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(three.logs[0].args[1], accounts[0], "Event was emitted for the wrong from.");
            // check that p0's board exists
            const four = await battleships.getPlayerOneBoardRoot(1);
            assert.equal(four, p0_board, "Player #0 didn't instantiate a board.");
            // check that p0's shots board exists
            const five = await battleships.getPlayerOneShotsBoard(1);
            assert.equal(five, true, "Player #0 didn't instantiate a shots board.");
            // check that game is still in state 3 
            const six = await battleships.checkGameState(1);
            assert.equal(six, 3, "State machine failure.");
        });
        it("Player #1 posts theirs.", async () =>{
            const one = await battleships.getPlayerTwoBoardRoot(1);
            assert.equal(one, 0x0, "Player #0 already had a board.");
            const two = await battleships.getPlayerTwoShotsBoard(1);
            assert.equal(two, false, "Player #0 already had a shots board.");
            const p1_board = '0x0000000000000000000000000000000000000000000000000000000000000002';
            const three = await battleships.PlaceShips(1, p1_board, {from: accounts[1]});
            assert.equal(three.logs[0].event, 'BoardAcknowledgeEvent', "Event of type SuggestedStake did not fire.");
            assert.equal(three.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(three.logs[0].args[1], accounts[1], "Event was emitted for the wrong from.");
            assert.equal(three.logs[1].event, 'PlayerZeroTurn', "Event of type PlayerZeroTurn did not fire.");
            const four = await battleships.getPlayerTwoBoardRoot(1);
            assert.equal(four, p1_board, "Player #0 didn't instantiate a board.");
            const five = await battleships.getPlayerTwoShotsBoard(1);
            assert.equal(five, true, "Player #0 didn't instantiate a shots board."); 
            const six = await battleships.checkGameState(1);
            assert.equal(six, 4, "State machine failure.");
        });
    });
    describe("Negative Placement tests.", async () =>{
        it("Make sure we are in state 4.", async () =>{
            const six = await battleships.checkGameState(1);
            assert.equal(six, 4, "State machine failure.");
        });
        it("Try pushing a new board as p0.", async () =>{
            var errored = false;
            try{
                const p0_board = '0x1000000000000000000000000000000000000000000000000000000000000000';
                await battleships.PlaceShips(1, p0_board);
            }catch (error){
                errored = true;
            }
            assert(errored, "P0 pushed a new board in a state that's not 3.")
        });
        it("Try pushing a new board as p1.", async () =>{
            var errored = false;
            try{
                const p1_board = '0x2000000000000000000000000000000000000000000000000000000000000000';
                await battleships.PlaceShips(1, p1_board, {from: accounts[1]});
            }catch (error){
                errored = true;
            }
            assert(errored, "P1 pushed a new board in a state that's not 3.")
        });
        it("Creating a new game (ID = 2).", async () =>{
            await battleships.newGame(false, {from: accounts[0]});
            await battleships.joinGame(2, {from: accounts[1]});
            await battleships.proposeStake(2, 5000);
            await battleships.proposeStake(2, 5000, {from: accounts[1]});
            await battleships.payStake(2, {value: 5000});
            await battleships.payStake(2, {from: accounts[1], value: 5000});
            const reply = await battleships.checkGameState(2);
            assert.equal(reply, 3, "Failed Setup");
        });
        it("Pushing two boards from the first player. The second push will fail.", async () => {
            var errored = false;
            var p0_board = '0x1000000000000000000000000000000000000000000000000000000000000000';
            await battleships.PlaceShips(2, p0_board);
            try{
                p0_board = '0x0000000000000000000000000000000000000000000000000000000000000001';
                await battleships.PlaceShips(2, p0_board);
            }catch (error){
                errored = true;
            }
            assert(errored, "P0 pushed two boards.")
        })
        it("Creating a new game (ID = 3).", async () =>{
            await battleships.newGame(false, {from: accounts[0]});
            await battleships.joinGame(3, {from: accounts[1]});
            await battleships.proposeStake(3, 5000);
            await battleships.proposeStake(3, 5000, {from: accounts[1]});
            await battleships.payStake(3, {value: 5000});
            await battleships.payStake(3, {from: accounts[1], value: 5000});
            const reply = await battleships.checkGameState(3);
            assert.equal(reply, 3, "Failed Setup");
        });
        it("Pushing two boards from the second player. The second push will fail.", async () => {
            var errored = false;
            var p0_board = '0x2000000000000000000000000000000000000000000000000000000000000000';
            await battleships.PlaceShips(3, p0_board, {from: accounts[1]});
            try{
                p0_board = '0x0000000000000000000000000000000000000000000000000000000000000002';
                await battleships.PlaceShips(3, p0_board, {from: accounts[1]});
            }catch (error){
                errored = true;
            }
            assert(errored, "P1 pushed two boards.")
        })
        it("Pushing a board from someone not in this game.", async () =>{
            var errored = false;
            var p0_board = '0x2000000000000000000000000000000000000000000000000000000000000000';
            try{
                await battleships.PlaceShips(3, p0_board, {from: accounts[2]});
            }catch (error){
                errored = true;
            }
            assert(errored, "Stranger pushed a board.");
        })
        it("Pushing a board for a non-existing game.", async () => {
            var errored = false;
            var p0_board = '0x2000000000000000000000000000000000000000000000000000000000000000';
            try{
                await battleships.PlaceShips(6, p0_board, {from: accounts[4]});
            }catch (error){
                errored = true;
            }
            assert(errored, "Pushed a board onto a phantom game.");
        })
    });
});