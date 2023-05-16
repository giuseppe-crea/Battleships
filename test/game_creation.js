contract("Battleships", function (accounts) {
    let battleships;
  
    before(async () => {
        battleships = await Battleships.deployed();
    });
  
    describe("Creating a new game", async () => {
      it("No games exist in the contract.", async () => {
        const currGames = await battleships.getGamePosition(0)
        assert.equal(currGames, 8, "Somehow game #0 exists!");
      });
    });
});