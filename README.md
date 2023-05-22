# Design Doc P2PBC “Battleships”

## Premise

## Implementation Choices

### Game design decisions

Games will be played on an 8x8 board with 20 ship tiles. These ships have no specific shape and can be placed anywhere on the board, but all 20 of them must be placed.
Any 8x8 board with 20 ship tiles and 44 water tiles is considered valid.
The first player to hit all his opponent’s ship tiles and subsequently prove the validity of their own board is declared the winner. If a player fails to prove their board was valid their opponent will be declared winner by default.

### State Machine

The Contract has 3 main phases composed of a certain number of sub-phases each. Roughly, we can divide the state of the contract in terms of the state of an individual game within the contract.
Each ‘game’ goes through:
1. Instantiation: 
    
    This phase begins when the game is first created by a user and ends when both users send in their board.
    
3. Game phase: 

    This phase is comprised of 4 sub-phases which model the turns of the two players, in a cycle. These phases are, in order: 
    1. Player 1’s firing round, during which player 1 can declare a spot on his opponent's board to fire on.
    2. Player 2's answer round, when player 2 is required to propose proof of whether a boat was hit or not.
    
4. Payment phase: In this phase the winner's board is validated and they are paid out. The game is then deleted from storage.

### Data Structures

#### Implementation of the user-side game board

The board must be publicly auditable, but only provable by the author. For this purpose we choose, as suggested, a Merkle tree. The root of the tree will be stored in the contract, and proof will be submitted each time by the author.
Given that the board is a SIZE_SIDE by SIZE_SIDE square of 0s (water) and 1s (ship), simply encoding this parameter into the leaf node of a Merkle tree would allow any third party to test each square for 1 or 0 and view anyone’s board. We need a client-side source of randomness.
TODO: Choose client-side source of randomness. 31 bit.
The random number is then concatenated with either 0 or 1, forming a 32 bit value. This value is then hashed by kekkak256. Each square on the board is treated this way.
The sender must take care to store all these different random values, as they will be necessary to claim the prize. 

### Contract

### Web-App
