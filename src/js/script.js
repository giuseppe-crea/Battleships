var ships_placed = 0; // global variable to keep track of the number of ships placed

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
                    // text should be centered both vertically and horizontally
                    tile.style.textAlign = "center";
                    tile.style.verticalAlign = "middle";
                    tile.innerHTML = 8-i;
                }
                // write the letter 'A' to 'H' in the last row
                if (i === 8 && j > 0) {
                    tile.style.textAlign = "center";
                    tile.style.verticalAlign = "middle";
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

    // Perform any desired actions with the clicked tile
    console.log("Clicked tile in grid: " + grid.id);
    console.log("Clicked tile index: " + index);
}