// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

contract Battleships {
    uint8 public constant NUMBER_OF_SHIP_SQUARES = 20;
    uint8 public constant BOARD_SIZE = 8;
    enum GameStates{
        WAITING, 
        SETTING_STAKE, 
        ACCEPTING_PAYMENT,
        PLACING_SHIPS, 
        P0_FIRING,
        P1_CHECKING,
        P1_FIRING,
        P0_CHECKING,
        DONE,
        NONE
    }

    // In this struct we save the view a player has of its opponent's board
    struct Board{
        bool valid;
        // N*N matrix of bits to store hits
        // bool[BOARD_SIZE][BOARD_SIZE] shots;
        // # of enemy pieces still left on the board
        // goes down by one each time we receive one 'you hit' event
        uint totalPieces;
        // 8*8, we use this to avoid cheating
        uint totalShots;
    }

    struct Player{
        bool valid;
        bool hasPaidStake;
        address playerAddress;
        uint proposedStake;
        bytes32 boardTreeRoot;
        Board shots_board;
    }

    struct Game{
        bool valid;
        bool canPay;
        // host is always player[0]
        Player[2] players;
        GameStates state;
        uint decidedStake;
        // used for foul accusation, a foul is triggered after 5 blocks
        uint blockNumber;
        // player 0 or player 1
        // might turn it into address, we will see
        bool accuser;
        // whether or not this game should be in the public pool of joinable games
        bool privateGame;
        address winner;
    }

    mapping(uint => Game) private openGames;

    Game private gameTrampoline;
    Player private playerTrampoline;
    Board private trampolineBoard;
    bool[BOARD_SIZE][BOARD_SIZE] private trampolineShots;
    // used in generating UUIDs for the games
    // for now we are gonna use this as-is
    // start at 1 as 0 is used for a non-existing game
    // TODO: deal with it overflowing
    uint private gameCounter;
    uint private lastOpenGame;

    constructor() {
        gameCounter = 1;
        lastOpenGame = 1;
    }

    event ShareID(address _from, address _to, uint _gameID);
    event GameStart(uint _gameID, address _host, address _challenger);
    event SuggestedStake(uint _gameID, address _from, address _to, uint _stakeValue);
    event GamePayable(uint _gameID, address _host, address _challenger, uint _stakeValue);
    event StakePaid(uint _gameID, address _whoPaid);
    event AcceptingBoards(uint _gameID);
    event BoardAcknowledgeEvent(uint _gameID, address _player);
    event PlayerZeroTurn(uint _gameID);
    event ShotsFired(uint _gameID, uint8 _location);
    event ShotsChecked(uint _gameID, uint8 _location, bool _isHit);
    event Victory(uint _gameID, address _winner);

    error InvalidGameID();
    error NotInGame();
    error StakeAlreadyDeposited();
    error WrongStakeAmount(uint expectedStakeValue);

    modifier gameExists(uint gameID){
        assert(openGames[gameID].valid);
        _;
    }

    modifier isInGame(uint gameID){
        assert((openGames[gameID].players[0].playerAddress == msg.sender) || (openGames[gameID].players[1].playerAddress == msg.sender));
        _;
    }

    modifier assertState(uint gameID, GameStates _state){
        assert(openGames[gameID].state == _state);
        _;
    }

    modifier playerInRange(uint gameID, uint index){
        assert(openGames[gameID].players[index].valid);
        assert(index < openGames[gameID].players.length);
        _;
    }

    // Code from OpenZeppelin's project
    // https://github.com/OpenZeppelin
    function verifyCalldata(
    bytes32[] calldata proof,
    bytes32 root,
    bytes32 leaf
    ) internal pure returns (bool) {
        return processProofCalldata(proof, leaf) == root;
    }

    function processProofCalldata(
        bytes32[] calldata proof,
        bytes32 leaf
    ) internal pure returns (bytes32) {
        bytes32 computedHash = leaf;
        for (uint256 i = 0; i < proof.length; i++) {
            computedHash = _hashPair(computedHash, proof[i]);
        }
        return computedHash;
    }

    function _hashPair(bytes32 a, bytes32 b)
        private
        pure
        returns(bytes32)
    {
        return a < b ? _efficientHash(a, b) : _efficientHash(b, a);
    }

    function _efficientHash(bytes32 a, bytes32 b)
        private
        pure
        returns (bytes32 value)
    {
        assembly {
            mstore(0x00, a)
            mstore(0x20, b)
            value := keccak256(0x00, 0x40)
        }
    }
    // end of OpenZeppelin code

    // create a Game value, add it to openGames, populate the Player[0]
    function newGame(bool isPrivate) public {
        uint gameID = gameCounter;
        gameCounter++;
        Game storage game = gameTrampoline;
        Player storage host = playerTrampoline;
        host.playerAddress = msg.sender;
        host.valid = true;
        host.hasPaidStake = false;
        game.players[0] = host;
        game.state = GameStates.WAITING;
        game.privateGame = isPrivate;
        game.valid = true;
        game.canPay = false;
        openGames[gameID] = game;
        emit ShareID(address(this), msg.sender, gameID);
        return;
    }
    
    function joinGame(uint gameID) public {
        if(gameID == 0){
            // pick an unassigned game in sequential order
            gameID = lastOpenGame;
            while(gameID <= gameCounter){
                // ignore games with sender as host (you can still join your own games directly if you're that lonely)
                if(openGames[gameID].valid == true && 
                    openGames[gameID].state == GameStates.WAITING && 
                    openGames[gameID].players[0].playerAddress != msg.sender && 
                    !openGames[gameID].privateGame){
                    break;
                }
                gameID++;
            }
            // update the lastOpenGame counter no matter what
            lastOpenGame = gameID;
        }
        // if the game wasn't valid, throw an error
        assert(openGames[gameID].valid);
        // set msg sender as this game's player 2
        Player storage challenger = playerTrampoline;
        challenger.playerAddress = msg.sender;
        challenger.valid = true;
        challenger.hasPaidStake = false;
        openGames[gameID].players[1] = challenger;
        // update this game's status
        openGames[gameID].state = GameStates.SETTING_STAKE;
        // alert the players
        emit GameStart(gameID, openGames[gameID].players[0].playerAddress, msg.sender);
        return;
    }

    function checkGameState(uint gameID) public view returns (GameStates) {
        if (openGames[gameID].valid){
            return openGames[gameID].state;
        }
        else 
            return(GameStates.NONE);
    }

    function checkGamePlayerOne(uint gameID) public view returns (address) {
        if (openGames[gameID].valid && openGames[gameID].players[0].valid){
            return openGames[gameID].players[0].playerAddress;
        }
        else 
            return(address(0));
    }

    function checkGamePlayerTwo(uint gameID) public view returns (address) {
        if (openGames[gameID].valid && openGames[gameID].players[1].valid){
            return openGames[gameID].players[1].playerAddress;
        }
        else 
            return(address(0));
    }

    // Function to propose and agree upon a stake between players
    function proposeStake(uint gameID, uint stakeValue) gameExists(gameID) isInGame(gameID) assertState(gameID, GameStates.SETTING_STAKE) public{
        Game memory game = openGames[gameID];
        // Check whether or not this player's opponent has already proposed a stake
        uint opponentIndex;
        uint stakerIndex;
        if(msg.sender == game.players[0].playerAddress){
            opponentIndex = 1;
            stakerIndex = 0;
        } else {
            opponentIndex = 0;
            stakerIndex = 1;
        }
        uint opponentStake = game.players[opponentIndex].proposedStake;
        // set this player's proposed stake to their message
        openGames[gameID].players[stakerIndex].proposedStake = stakeValue;
        // if the opponent has proposed a stake we check whether or not it equals the one proposed by us
        // 0 is not a valid stake
        if(opponentStake != 0 && opponentStake == stakeValue){
            openGames[gameID].decidedStake = stakeValue;
            openGames[gameID].state = GameStates.ACCEPTING_PAYMENT;
            emit GamePayable(gameID, game.players[0].playerAddress, game.players[1].playerAddress, stakeValue);
        }else{
            emit SuggestedStake(gameID, msg.sender, game.players[opponentIndex].playerAddress, stakeValue);
        }
        return;
    }

    function checkStakePlayerOne(uint gameID) public view returns (uint) {
        if (openGames[gameID].valid && openGames[gameID].players[0].valid){
            return openGames[gameID].players[0].proposedStake;
        }
        else 
            return(0);
    }

    function checkStakePlayerTwo(uint gameID) public view returns (uint) {
        if (openGames[gameID].valid && openGames[gameID].players[1].valid){
            return openGames[gameID].players[1].proposedStake;
        }
        else 
            return(0);
    }

    function checkStakeGame(uint gameID) public view returns (uint) {
        if (openGames[gameID].valid && openGames[gameID].players[0].valid && openGames[gameID].players[1].valid)
            return openGames[gameID].decidedStake;
        else
            return(0);
    }
    
    function payStake(uint gameID) gameExists(gameID) isInGame(gameID) assertState(gameID, GameStates.ACCEPTING_PAYMENT) external payable {
        if((msg.sender == openGames[gameID].players[0].playerAddress && openGames[gameID].players[0].hasPaidStake) ||
            (msg.sender == openGames[gameID].players[1].playerAddress && openGames[gameID].players[1].hasPaidStake))
            revert StakeAlreadyDeposited();
        // only accept payments for the exact amount owed
        if(msg.value != openGames[gameID].decidedStake)
            revert WrongStakeAmount(openGames[gameID].decidedStake);
        // now we check who the sender is
        uint senderIndex;
        uint challengerIndex;
        if(msg.sender == openGames[gameID].players[0].playerAddress){
            senderIndex = 0;
            challengerIndex = 1;
        }else{
            senderIndex = 1;
            challengerIndex = 0;
        }
        openGames[gameID].players[senderIndex].hasPaidStake = true;
        emit StakePaid(gameID, msg.sender);
        // if both players have paid the owed stake the game can move on to its next state
        if(openGames[gameID].players[challengerIndex].hasPaidStake){
            openGames[gameID].state = GameStates.PLACING_SHIPS;
            emit AcceptingBoards(gameID);
        }
    }

    function checkPaymentPlayerOne(uint gameID) public view returns (bool) {
        if (openGames[gameID].valid && openGames[gameID].players[0].valid){
            return openGames[gameID].players[0].hasPaidStake;
        }
        else 
            return(false);
    }

    function checkPaymentPlayerTwo(uint gameID) public view returns (bool) {
        if (openGames[gameID].valid && openGames[gameID].players[1].valid){
            return openGames[gameID].players[1].hasPaidStake;
        }
        else 
            return(false);
    }

    function checkGamePayable(uint gameID) public view returns (bool) {
        if (openGames[gameID].valid && openGames[gameID].players[0].valid && openGames[gameID].players[1].valid)
            return openGames[gameID].canPay;
        else
            return(false);
    }
    
    // TODO: Maybe move the Board instantiation outside of this function
    function PlaceShips(uint gameID, bytes32 boardRoot) gameExists(gameID) isInGame(gameID) assertState(gameID, GameStates.PLACING_SHIPS) public{
        uint index;
        uint oppIdx;
        msg.sender == openGames[gameID].players[0].playerAddress ? index = 0 : index = 1;
        msg.sender == openGames[gameID].players[0].playerAddress ? oppIdx = 1 : oppIdx = 0;
        require(openGames[gameID].players[index].boardTreeRoot == 0x0);
        // Instantiate a new shots board
        // Instantiate the Board struct itself and assign it to a player
        Board storage playerBoard = trampolineBoard;
        trampolineBoard.valid = true;
        trampolineBoard.totalPieces = NUMBER_OF_SHIP_SQUARES;
        trampolineBoard.totalShots = BOARD_SIZE;
        openGames[gameID].players[index].shots_board = playerBoard;
        // save the received boardRoot, finally
        openGames[gameID].players[index].boardTreeRoot = boardRoot;
        emit BoardAcknowledgeEvent(gameID, msg.sender);
        if(openGames[gameID].players[oppIdx].boardTreeRoot != 0x0){
            openGames[gameID].state = GameStates.P0_FIRING;
            emit PlayerZeroTurn(gameID);
        }
    }

    function getPlayerBoardRoot(uint gameID, uint index) playerInRange(gameID, index) gameExists(gameID) private view returns(bytes32){
        return openGames[gameID].players[index].boardTreeRoot;
    }

    function getPlayerOneBoardRoot(uint gameID) public view returns (bytes32){
        return getPlayerBoardRoot(gameID, 0);
    }

    function getPlayerTwoBoardRoot(uint gameID) public view returns (bytes32){
        return getPlayerBoardRoot(gameID, 1);
    }

    // We should never have any use for these following functions
    // Marking them as DEPRECATED now
    // we will see if they survive the cutting room floor
    
    // DEPRECATED
    function getPlayerShotsBoard(uint gameID, uint index) playerInRange(gameID, index) gameExists(gameID) private view returns(bool){
        return openGames[gameID].players[index].shots_board.valid;
    }

    // DEPRECATED
    function getPlayerOneShotsBoard(uint gameID) public view returns (bool){
        return getPlayerShotsBoard(gameID, 0);
    }

    // DEPRECATED
    function getPlayerTwoShotsBoard(uint gameID) public view returns (bool){
        return getPlayerShotsBoard(gameID, 1);
    }

    // TODO: Write Tests for everything below this line
    // locations are 0-indexed
    function FireTorpedo(uint gameID, uint8 location) gameExists(gameID) isInGame(gameID) public {
        uint index;
        uint oppIdx;
        GameStates legalState;
        if(msg.sender == openGames[gameID].players[0].playerAddress){
            index = 0;
            oppIdx = 1;
            legalState = GameStates.P0_FIRING;
        } else {
            index = 1;
            oppIdx = 0;
            legalState = GameStates.P1_FIRING;
        }
        assert(openGames[gameID].state == legalState);
        // Rotate into correct next state
        legalState == GameStates.P0_FIRING ? legalState = GameStates.P1_CHECKING : legalState = GameStates.P0_CHECKING;
        openGames[gameID].state = legalState;
        // Now for some game logic
        // whatever happens, we lower the totalShots counter of our system by one
        openGames[gameID].players[index].shots_board.totalShots--;
        // Then we evaluate whether or not this is zero. If it is, This party wins automatically.
        // We do this here to avoid opponents stalling out on the reply for 5 blocks on what is a foregone conclusion
        if (openGames[gameID].players[index].shots_board.totalShots == 0){
            VerifyWinner(gameID, index, oppIdx);
        } else {
            emit ShotsFired(gameID, location);
        }
    }

    function ConfirmShot(uint gameID, uint8 location, bool isHit, bytes32[] calldata proof) gameExists(gameID) isInGame(gameID) public {
        uint index;
        uint oppIdx;
        GameStates legalState;
        if(msg.sender == openGames[gameID].players[0].playerAddress){
            index = 0;
            oppIdx = 1;
            legalState = GameStates.P0_CHECKING;
        } else {
            index = 1;
            oppIdx = 0;
            legalState = GameStates.P1_CHECKING;
        }
        assert(openGames[gameID].state == legalState);
        assert(location < (BOARD_SIZE*BOARD_SIZE));

        // TODO REMOVE THIS MAGIC FREE PASS
        // TODO IMPLEMENT ACTUAL PROOF CHECK
        if(true){
            // we could verify this user's proof
            // update the firing user's shots board
            //openGames[gameID].players[oppIdx].shots_board.shots[location_x][location_y] = isHit;
            // rotate state
            openGames[gameID].state == GameStates.P1_CHECKING ? openGames[gameID].state = GameStates.P1_FIRING : openGames[gameID].state = GameStates.P0_FIRING;
            emit ShotsChecked(gameID, location, isHit);
        } else {
            // else we mark him as foul'd but do NOT rotate the state.
            // TODO IMPLEMENT FOUL MECHANICS
        }
    }

    function VerifyWinner(uint gameID, uint winnerIndex, uint loserIndex) private {
        address verifiedWinner;
        // TODO: verify the merkle board for the winner first of all
        // this requires asking the winner for their board
        // if that fails, verify it for the loser and pay THEM out if it succeeds

        // finally set the contract as payable
        openGames[gameID].canPay = true;
        openGames[gameID].winner = verifiedWinner;
        emit Victory(gameID, msg.sender);
    }
}