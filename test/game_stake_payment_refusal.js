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
        const one = await battleships.checkGameState(1);
        assert.equal(one, Battleships.GameStates.ACCEPTING_PAYMENT, "Failed Setup");
        const reply = await battleships.payStake(1, {value: 5000});
        assert.equal(reply.logs[0].event, 'StakePaid', "Event of type StakePaid did not fire.");
        assert.equal(reply.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
        assert.equal(reply.logs[0].args[1], accounts[0], "Event was emitted for the wrong from.");
    });

    describe("Just the one test:", async () => {
        it("Refusing to pay stake on player two.", async () =>{
            const reply = await battleships.declineStake(1, {from: accounts[1]});
            assert.equal(reply.logs[0].event, 'GameEnded', "Event of type GameEnded did not fire.");
            assert.equal(reply.logs[0].args[0], 1, "Event was emitted for the wrong gameID.");
            console.log("Gas cost of refusing to pay stake: " + reply.receipt.gasUsed);
        });
    });
});