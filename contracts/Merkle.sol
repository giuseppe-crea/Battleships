// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

library Merkle {
    // Code from OpenZeppelin's project
    // https://github.com/OpenZeppelin
    function verifyCalldata(
    bytes32[] calldata proof,
    bytes32 root,
    bytes32 leaf
    ) external pure returns (bool) {
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
}