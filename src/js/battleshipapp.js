var ships_placed = 0; // global variable to keep track of the number of ships placed
// global boolean array to keep track of the player's placed ships, 64 positions, initially all false
var ships = new Array(64).fill(false);
// global boolean array to keep track of the player's hits, 64 positions, initially all false
var hits = new Array(64).fill(false); 
// Create the first grid dynamically
// get the html element 'your-grid' by id and assign it to a variable
var grid1 = document.getElementById("your-grid");
var grid2 = document.getElementById("opponent-grid");
var grids = [grid1, grid2];
grids.forEach(element => {
    for (var i = 0; i < 9; i++) {
        for (var j = 0; j < 9; j++) {
            var tile = document.createElement("div");
            if(j === 0 || i === 8) {
                // the first tile in each row is a label
                tile.className = "tile-label";
                tile.style.pointerEvents = "none";
                // write the numbers '1' to '8'in the first column
                if (j === 0 && i >= 0) {
                    tile.innerHTML = 8-i;
                }
                // write the letter 'A' to 'H' in the last row
                if (i === 8 && j > 0) {
                    tile.innerHTML = String.fromCharCode(64 + j);
                }
        } else {
            tile.className = "tile";
            tile.dataset.index = i * 8 + j-1; // Assigning a unique index to each tile
            tile.addEventListener("click", handleClick);
        }
        element.appendChild(tile);
        }
    }
});

function handleClick(event) {
    // Find the parent grid element of the clicked tile
    var grid = event.target.closest('.grid');
    
    // Get the clicked tile's index
    var index = event.target.dataset.index;
    // make the tile unclickable
    event.target.style.pointerEvents = "none";
    // change the tile's color to grey if it's in the first grid, red if it's in the second grid
    if (grid.id === "your-grid" && ships_placed < 20) {
        event.target.style.backgroundColor = "grey";
        ships[index] = true; // set the corresponding position in the ships array to true
        // also increment the global counter 'ships_placed' by one
        ships_placed++;
    } else if (grid.id === "opponent-grid"){
        event.target.style.backgroundColor = "red";
    }
    // disable every tile in the first grid once 20 ships have been placed
    if (ships_placed === 20) {
        var tiles = document.querySelectorAll("#your-grid .tile");
        for (var i = 0; i < tiles.length; i++) {
            tiles[i].style.pointerEvents = "none";
        }
    }
}

var printGameStateButton = document.getElementById("print-game-state-btn");
printGameStateButton.addEventListener("click", printGameState);

function printGameState() {
    console.log("Ships placed: " + ships_placed);
    console.log("Ships: " + ships);
    console.log("Hits: " + hits);
}

App = {
    web3Provider: null,
    contracts: {},
  
    init: async function() {
        return await App.initWeb3();
    },
  
    initWeb3: async function() {
      // Modern dapp browsers...
      if (window.ethereum) {
        App.web3Provider = window.ethereum;
        try {
          // Request account access
          await window.ethereum.enable();
        } catch (error) {
          // User denied account access...
          console.error("User denied account access")
        }
      }
      // Legacy dapp browsers...
      else if (window.web3) {
        App.web3Provider = window.web3.currentProvider;
      }
      // If no injected web3 instance is detected, fall back to Ganache
      else {
        App.web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
      }
      web3 = new Web3(App.web3Provider);
  
      return App.initContract();
    },
  
    initContract: function() {
        $.getJSON('Battleships.json', function(data) {
            // Get the necessary contract artifact file and instantiate it with @truffle/contract
            var BattleshipsArtifact = data;
            App.contracts.Battleships = TruffleContract(BattleshipsArtifact);
        
            // Set the provider for our contract
            App.contracts.Battleships.setProvider(App.web3Provider);
        
            // Use our contract to retrieve and mark the adopted pets
            return App;
        });
  
        return App.bindEvents();
    },
  
    bindEvents: function() {
        // using the same sintax as the example below, create binding for all components of our app
        $(document).on('click', '#opponent-grid .tile', App.opponentGridClick);
        // bind the click event on tiles in the first grid to the handleTileClick function
        $(document).on('click', '#your-grid .tile', App.playerGridClick);
    },
  
    opponentGridClick: function(event) {
        // Find the parent grid element of the clicked tile
        var grid = event.target.closest('.grid');
        var index = event.target.dataset.index;
        // print the tile number and grid id to the console
        console.log("Opponent's grid: " + Number(index));
    },

    playerGridClick: function(event) {
        // Find the parent grid element of the clicked tile
        var grid = event.target.closest('.grid');
        var index = event.target.dataset.index;
        // print the tile number and grid id to the console
        console.log("Your grid " + Number(index));
    }
    /*
    handleAdopt: function(event) {
      event.preventDefault();
  
      var petId = parseInt($(event.target).data('id'));
  
      var adoptionInstance;
  
      web3.eth.getAccounts(function(error, accounts) {
        if (error) {
          console.log(error);
        }
  
        var account = accounts[0];
  
        App.contracts.Adoption.deployed().then(function(instance) {
          adoptionInstance = instance;
  
          // Execute adopt as a transaction by sending account
          return adoptionInstance.adopt(petId, {from: account});
        }).then(function(result) {
          // notice how result is unused as it is a tx receipt
          return App.markAdopted();
        }).catch(function(err) {
          console.log(err.message);
        });
      });
    }
    */
};
  
$(function() {
    $(window).load(function() {
        App.init();
    });
});
  