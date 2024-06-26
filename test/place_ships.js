const Battleships = artifacts.require("Battleships");

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
        await battleships.newGame(false, {from: accounts[0]});
        await battleships.joinGame(1, {from: accounts[1]});
        const reply = await battleships.checkGameState(1);
        assert.equal(reply, Battleships.GameStates.PLACING_SHIPS, "Failed Setup");
    });
    describe("Correct Placement tests.", async () =>{
        it("Player #0 posts their board.", async () =>{
            // post a board
            const p0_board = '0x0000000000000000000000000000000000000000000000000000000000000001';
            const three = await battleships.PlaceShips(1, p0_board);
            assert.equal(three.logs[0].event, 'BoardAcknowledgeEvent', "Event of type SuggestedStake did not fire.");
            assert.equal(three.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(three.logs[0].args[1], accounts[0], "Event was emitted for the wrong from.");
            // check that game is still in state 3 
            const six = await battleships.checkGameState(1);
            assert.equal(six, Battleships.GameStates.PLACING_SHIPS, "State machine failure.");
        });
        it("Player #1 posts theirs.", async () =>{
            const p1_board = '0x0000000000000000000000000000000000000000000000000000000000000002';
            const three = await battleships.PlaceShips(1, p1_board, {from: accounts[1]});
            assert.equal(three.logs[0].event, 'BoardAcknowledgeEvent', "Event of type SuggestedStake did not fire.");
            assert.equal(three.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(three.logs[0].args[1], accounts[1], "Event was emitted for the wrong from.");
            assert.equal(three.logs[1].event, 'GameStart', "Event of type GameStart did not fire.");
            const six = await battleships.checkGameState(1);
            assert.equal(six, Battleships.GameStates.SETTING_STAKE, "State machine failure.");
        });
    });
    describe("Negative Placement tests.", async () =>{
        it("Make sure we are in state 4.", async () =>{
            const six = await battleships.checkGameState(1);
            assert.equal(six, Battleships.GameStates.SETTING_STAKE, "State machine failure.");
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
            const reply = await battleships.checkGameState(2);
            assert.equal(reply, Battleships.GameStates.PLACING_SHIPS, "Failed Setup");
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
            const reply = await battleships.checkGameState(3);
            assert.equal(reply, Battleships.GameStates.PLACING_SHIPS, "Failed Setup");
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