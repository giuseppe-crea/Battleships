const Battleships = artifacts.require("Battleships");

contract("Battleships", function (accounts) {
    let battleships;
  
    before(async () => {
        battleships = await Battleships.deployed();
    });
  
    describe("Creating a new game", async () => {
      it("No games exist in the contract.", async () => {
        const currGames = await battleships.checkGameState(0);
        assert.equal(currGames, 8, "Somehow game #0 exists!");
      });
      it("One game now exists in the contract.", async () => {
        const newGameID = await battleships.newGame(false);
        // grab the event and parse it
        // the format is (from, to, game id)
        assert.equal(newGameID.logs[0].event, 'ShareID', "Event of type ShareID did not fire.");
        assert.equal(newGameID.logs[0].args[1], accounts[0], "Event was emitted for the wrong recipient.");
        assert.equal(newGameID.logs[0].args[2], 0, "Returned ID was not zero.");
      });
      it("Checking state of game #0.", async () => {
        const currGames = await battleships.checkGameState(0);
        assert.equal(currGames, 0, "Somehow game #0 is not in state 0!");
      })
      it("Checking host for game #0", async () => {
        const playerOne = await battleships.checkGamePlayerOne(0);
        console.log(playerOne);
        assert.equal(playerOne, accounts[0], "Game 0 has the wrong host!");
      })
    });
});