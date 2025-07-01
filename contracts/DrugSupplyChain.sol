// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract DrugSupplyChain {

    struct Drug {
        uint id;
        string name;
        address manufacturer;
        string[] history;
    }

    mapping(uint => Drug) public drugs;

    // Event for logging
    event DrugAdded(uint id, string name, address manufacturer);
    event HistoryUpdated(uint id, string eventDetail);

    // Add a new drug to the supply chain
    function addDrug(uint _id, string memory _name) public {
        require(drugs[_id].manufacturer == address(0), "Drug already exists");

        drugs[_id].id = _id;
        drugs[_id].name = _name;
        drugs[_id].manufacturer = msg.sender;
        drugs[_id].history.push("Drug Created by Manufacturer");

        emit DrugAdded(_id, _name, msg.sender);
    }

    // Update the history (e.g., "Approved by CDSCO", "Sent to Hospital", etc.)
    function updateHistory(uint _id, string memory _event) public {
        require(drugs[_id].manufacturer != address(0), "Drug not found");

        drugs[_id].history.push(_event);

        emit HistoryUpdated(_id, _event);
    }

    // Get full movement history of the drug
    function getHistory(uint _id) public view returns (string[] memory) {
        return drugs[_id].history;
    }

    // Optional: Get full details of a drug
    function getDrug(uint _id) public view returns (uint, string memory, address, string[] memory) {
        Drug memory d = drugs[_id];
        return (d.id, d.name, d.manufacturer, d.history);
    }
}
