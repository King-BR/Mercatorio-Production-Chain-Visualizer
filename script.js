let recipes = {}; // This will hold the data from recipes.json
let userChoices = {}; // Holds user choices (produce/buy) and prices

document.addEventListener("DOMContentLoaded", () => {
  fetch("recipes.json")
    .then((response) => response.json())
    .then((data) => {
      recipes = data;

      // Populate the product select dropdown with all recipe outputs
      const recipeSelect = document.getElementById("root-recipe-select");
      Object.values(recipes).forEach((recipe) => {
        const option = document.createElement("option");
        option.value = recipe.name; // Use the recipe name as the value
        option.text = recipe.name; // Display the recipe name in the dropdown
        recipeSelect.appendChild(option);
      });
    })
    .catch((error) => console.error("Error loading recipes:", error));

  // Event listener for the start production button
  document
    .getElementById("start-production-btn")
    .addEventListener("click", () => {
      const selectedRecipe =
        document.getElementById("root-recipe-select").value;
      if (selectedRecipe) {
        const treeContent = document.getElementById("tree-content");
        if (treeContent) {
          treeContent.innerHTML = ""; // Clear the current tree
        } else {
          const newTreeContent = document.createElement("div");
          newTreeContent.id = "tree-content";
          document.getElementById("tree-container").appendChild(newTreeContent);
        }
        const rootRecipe = findRecipeByName(selectedRecipe);
        if (rootRecipe) {
          renderRecipe(
            rootRecipe.name,
            document.getElementById("tree-content"),
            1,
            []
          );
        } else {
          alert("Recipe for the selected product not found.");
        }
      } else {
        alert("Please select a product to produce.");
      }
    });

  // Event listeners for import/export buttons
  document
    .getElementById("export-btn")
    .addEventListener("click", exportChoices);
  document.getElementById("import-btn").addEventListener("click", () => {
    document.getElementById("import-input").click();
  });
  document
    .getElementById("import-input")
    .addEventListener("change", importChoices);
});

// Recursive function to render the recipe and its dependencies
function renderRecipe(recipeName, container, depth, visitedRecipes) {
  // Avoid infinite recursion by checking if the recipe has already been visited
  if (visitedRecipes.includes(recipeName)) return;
  visitedRecipes.push(recipeName);

  const recipe = recipes[recipeName];

  // Check if the recipe is defined
  if (!recipe) return;

  // Skip bots-only recipes
  if (recipe.bots_only) return;

  // Create a div for the recipe
  const recipeDiv = document.createElement("div");
  recipeDiv.classList.add("recipe");
  if (recipe.guided) recipeDiv.classList.add("recipe-guided");

  // Add recipe details
  const header = document.createElement("div");
  header.classList.add("recipe-header");
  header.innerHTML = `
        <div>
            <strong>${recipe.name}</strong> (Class: ${recipe.class}, Tier: ${
    recipe.tier
  }, Building: ${recipe.building}${
    recipe.upgrade ? ", Upgrades: " + recipe.upgrades.join(", ") : ""
  })
        </div>
        <div class="recipe-info">${
          recipe.guided
            ? recipe.tier == 4
              ? "Requires Master Level Worker"
              : "Requires Specialist Head of Household"
            : ""
        }</div>
    `;
  recipeDiv.appendChild(header);

  // Create choice buttons
  const choiceContainer = document.createElement("div");
  const produceButton = document.createElement("button");
  produceButton.innerText = "Produce";
  produceButton.addEventListener("click", () =>
    handleChoice(recipeName, true, recipeDiv)
  );

  const buyButton = document.createElement("button");
  buyButton.innerText = "Buy";
  buyButton.addEventListener("click", () =>
    handleChoice(recipeName, false, recipeDiv)
  );

  choiceContainer.appendChild(produceButton);
  choiceContainer.appendChild(buyButton);
  recipeDiv.appendChild(choiceContainer);

  // Render inputs and outputs
  if (userChoices[recipeName] && userChoices[recipeName].produce) {
    renderInputs(recipe, recipeDiv, depth);
  } else if (recipe.inputs) {
    recipe.inputs.forEach((input) => {
      const subRecipe = findRecipeForProduct(input.product);
      if (subRecipe) {
        const subContainer = document.createElement("div");
        subContainer.style.marginLeft = `${depth * 20}px`;
        renderRecipe(subRecipe.name, subContainer, depth + 1, visitedRecipes);
        recipeDiv.appendChild(subContainer);
      } else {
        const buyInputDiv = document.createElement("div");
        buyInputDiv.innerHTML = `Buy <strong>${input.product}</strong>: 
                                         <input type="number" placeholder="Price per unit" 
                                         value="${
                                           userChoices[input.product]?.price ||
                                           ""
                                         }" 
                                         onchange="updatePrice('${
                                           input.product
                                         }', this.value)" />`;
        recipeDiv.appendChild(buyInputDiv);
      }
    });
  }

  container.appendChild(recipeDiv);
}

// Function to render inputs with choice to produce or buy
function renderInputs(recipe, recipeDiv, depth) {
  if (!recipe.inputs) return;

  recipe.inputs.forEach((input) => {
    const inputDiv = document.createElement("div");
    const inputLabel = document.createElement("label");
    inputLabel.innerText = `Input: ${input.product}`;

    const choiceSelect = document.createElement("select");
    const produceOption = document.createElement("option");
    produceOption.value = "produce";
    produceOption.text = "Produce";
    const buyOption = document.createElement("option");
    buyOption.value = "buy";
    buyOption.text = "Buy";

    choiceSelect.appendChild(produceOption);
    choiceSelect.appendChild(buyOption);
    choiceSelect.value = userChoices[input.product]?.produce
      ? "produce"
      : "buy";
    choiceSelect.addEventListener("change", (e) =>
      handleInputChoiceChange(e, input.product, recipeDiv, depth)
    );

    inputDiv.appendChild(inputLabel);
    inputDiv.appendChild(choiceSelect);
    recipeDiv.appendChild(inputDiv);

    // Handle initial rendering based on choice
    handleInputChoiceChange(
      { target: choiceSelect },
      input.product,
      recipeDiv,
      depth
    );
  });
}

// Handle choice for input change
function handleInputChoiceChange(event, product, recipeDiv, depth) {
  const choice = event.target.value;
  const inputDiv = event.target.parentElement;

  // Clear previous content related to this input
  inputDiv
    .querySelectorAll(".sub-recipe, .buy-input")
    .forEach((node) => node.remove());

  if (choice === "produce") {
    const subRecipe = findRecipeForProduct(product);
    if (subRecipe) {
      const subContainer = document.createElement("div");
      subContainer.style.marginLeft = `${depth * 20}px`;
      renderRecipe(subRecipe.name, subContainer, depth + 1, []);
      recipeDiv.appendChild(subContainer);
    }
  } else if (choice === "buy") {
    const buyInputDiv = document.createElement("div");
    buyInputDiv.classList.add("buy-input");
    buyInputDiv.innerHTML = `Buy <strong>${product}</strong>: 
                                         <input type="number" placeholder="Price per unit" 
                                         value="${
                                           userChoices[product]?.price || ""
                                         }" 
                                         onchange="updatePrice('${product}', this.value)" />`;
    inputDiv.appendChild(buyInputDiv);
  }
}

// Handle user choice
function handleChoice(recipeName, produce, recipeDiv) {
  userChoices[recipeName] = { ...userChoices[recipeName], produce };
  recipeDiv.querySelectorAll(".sub-recipe").forEach((node) => node.remove());
  renderRecipe(recipeName, recipeDiv.parentNode, 1, []);
}

// Find recipe for a product
function findRecipeForProduct(product) {
  return Object.values(recipes).find(
    (recipe) =>
      recipe.outputs &&
      recipe.outputs.some((output) => output.product === product)
  );
}

// Find recipe by recipe name
function findRecipeByName(recipeName) {
  return recipes[recipeName];
}

// Update the price for a product
function updatePrice(product, price) {
  userChoices[product] = { ...userChoices[product], price: parseFloat(price) };
}

// Export the user's choices and prices as a JSON file
function exportChoices() {
  const dataStr = JSON.stringify(userChoices, null, 2);
  const dataBlob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(dataBlob);

  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = "production_chain_choices.json";
  downloadLink.click();

  URL.revokeObjectURL(url);
}

// Import the user's choices and prices from a JSON file
function importChoices() {
  const input = document.getElementById("import-input");
  if (input.files.length === 0) {
    alert("Please choose a file to import.");
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = (event) => {
    try {
      const importedChoices = JSON.parse(event.target.result);
      userChoices = importedChoices;
      alert("Choices imported successfully.");
    } catch (error) {
      alert("Failed to import choices. Please check the file format.");
    }
  };

  reader.readAsText(file);
}
