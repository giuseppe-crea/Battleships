const Battleships = artifacts.require("Battleships");
const board_root = ['0x1', '0x2'];

contract("Battleships", function (accounts) {
    let battleships;
    before(async () => {
        battleships = await Battleships.deployed();
        await battleships.newGame(false, {from: accounts[0]});
        await battleships.joinGame(1, {from: accounts[1]});
        await battleships.PlaceShips(1, board_root[0]);
        await battleships.PlaceShips(1, board_root[1], {from: accounts[1]});
        await battleships.proposeStake(1, 5000);
        await battleships.proposeStake(1, 5000, {from: accounts[1]});
        const reply = await battleships.checkGameState(1);
        assert.equal(reply, Battleships.GameStates.ACCEPTING_PAYMENT, "Failed Setup");
    });

    describe("Paying a game's stake as player one:", async () => {
        it("Paying out from host of game.", async () =>{
            const reply = await battleships.payStake(1, {value: 5000});
            assert.equal(reply.logs[0].event, 'StakePaid', "Event of type StakePaid did not fire.");
            assert.equal(reply.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(reply.logs[0].args[1], accounts[0], "Event was emitted for the wrong from.");
        });
    });

    describe("Testing wrongful payments.", async () => {
        it("Pay from an address not in the game.", async () =>{
            // sadly truffle can't test custom error codes
            // we check for a generic EVM exception instead
            var reverted = false;
            try{
                const reply = await battleships.payStake(1, {from: accounts[2], value: 100});
            }
            catch(error){
                reverted = true;
            }
            assert(reverted, "The transaction somehow went through!")
        });
        it("Pay for a non-existing game.", async () =>{
            var reverted = false;
            try{
                const reply = await battleships.payStake(2, {value: 100});
            }
            catch(error){
                reverted = true;
            }
            assert(reverted, "The transaction somehow went through!")
        });
        it("Pay for a game twice.", async () =>{
            var reverted = false;
            try{
                // now we try to pay again and see if the EVM crashes
                const reply = await battleships.payStake(1, {value: 5000});
            }
            catch(error){
                reverted = true;
            }
            assert(reverted, "The transaction somehow went through!")
        });
        it("Pay the wrong amount.", async () =>{
            var reverted = false;
            try{
                // now we try to pay again and see if the EVM crashes
                const reply = await battleships.payStake(1, {from: accounts[1], value: 100});
            }
            catch(error){
                reverted = true;
            }
            assert(reverted, "The transaction somehow went through!")
        });
    });

    describe("Finishing the stake payment procedure for game #1.", async () => {
        it("Paying on second user.", async () => {
            const reply = await battleships.payStake(1, {from: accounts[1], value: 5000});
            assert.equal(reply.logs[0].event, 'StakePaid', "Event of type StakePaid did not fire.");
            assert.equal(reply.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            assert.equal(reply.logs[0].args[1], accounts[1], "Event was emitted for the wrong from.");
            assert.equal(reply.logs[1].event, 'PlayerZeroTurn', "Event of type PlayerZeroTurn did not fire.");
        });
        it("Making sure the game is in the correct state.", async () => {
            const reply = await battleships.checkGameState(1);
            assert.equal(reply, Battleships.GameStates.P0_FIRING, "Game is not in PLACING_SHIPS state!")
        })
    });
});