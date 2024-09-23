// Carregar as receitas usando fetchFromLocal
async function loadRecipes() {
  try {
    var recipes = await fetchFromLocal("assets/recipes.json");
    return recipes;
  } catch (error) {
    console.error("Failed to load recipes:", error);
    return {};
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const recipeSelector = document.getElementById("recipe-selector");
  const buildingsUsed = document.getElementById("buildings-used");
  const upgrades = document.getElementById("upgrades");
  const tier = document.getElementById("tier");
  const guided = document.getElementById("guided");
  const productionTree = document.getElementById("production-tree");
  const finalProductPercentage = document.getElementById(
    "final-product-percentage"
  );

  // Carregar as receitas
  const recipes = await loadRecipes();

  // Popula o dropdown de receitas
  populateRecipeDropdown(recipes);

  // Manuseio da seleção de receita
  recipeSelector.addEventListener("change", () => {
    const selectedRecipeKey = recipeSelector.value;
    const selectedRecipe = recipes[selectedRecipeKey];
    if (selectedRecipe) {
      updateRecipeInfo(selectedRecipe);
      generateProductionTree(
        selectedRecipe,
        finalProductPercentage.value,
        productionTree
      );
    }
  });

  // Atualizar a árvore de produção quando a porcentagem do produto final mudar
  finalProductPercentage.addEventListener("input", () => {
    const selectedRecipeKey = recipeSelector.value;
    const selectedRecipe = recipes[selectedRecipeKey];
    if (selectedRecipe) {
      generateProductionTree(
        selectedRecipe,
        finalProductPercentage.value,
        productionTree
      );
    }
  });

  // Função para popular o dropdown com as receitas
  function populateRecipeDropdown(recipes) {
    Object.keys(recipes).forEach((key) => {
      if (!recipes[key].bots_only) {
        const option = document.createElement("option");
        option.value = key;
        option.text = recipes[key].name;
        recipeSelector.appendChild(option);
      }
    });
  }

  // Atualiza as informações da receita selecionada
  function updateRecipeInfo(recipe) {
    buildingsUsed.textContent = recipe.building || "N/A";
    upgrades.textContent = recipe.upgrades ? recipe.upgrades.join(", ") : "N/A";
    tier.textContent = recipe.tier || "N/A";
    guided.textContent = recipe.guided ? "Yes" : "No";
  }

  /**
   * Gera a árvore de produção
   * @param {*} recipe
   * @param {string} percentage
   */
  function generateProductionTree(recipe, percentage, container) {
    container.innerHTML = ""; // Limpar nodes existentes

    if (!percentage) percentage = 0;

    const validPercentage = Math.max(
      0,
      Math.min(101, parseFloat(percentage).toFixed(1))
    );

    // Renderiza os outputs
    recipe.outputs.forEach((output) => {
      const outputQuantity = calculateOutputQuantity(
        validPercentage,
        output.amount
      );
      const rootNode = createNode(output.product, outputQuantity, recipes);
      container.appendChild(rootNode);
    });

    // Container para inputs
    const inputGroup = document.createElement("div");
    inputGroup.classList.add("node-group");
    container.appendChild(inputGroup);

    // Renderiza os inputs
    if (recipe.inputs) recipe.inputs.forEach((input) => {
      const inputQuantity = calculateInputQuantity(
        input.amount,
        validPercentage,
        recipe.outputs[0].amount
      );
      const inputNode = createNode(input.product, inputQuantity, recipes);
      inputGroup.appendChild(inputNode);

      if (input.product !== "labour") {
        renderInputProduction(input.product, inputQuantity, recipes, inputNode);
      }
    });
  }

  // Função para renderizar a árvore de produção de inputs recursivamente
  function renderInputProduction(product, quantity, recipes, parentNode) {
    const recipeForInput = recipes[product];
    if (recipeForInput) {
      const inputNode = createNode(
        recipeForInput.outputs[0].product,
        quantity,
        recipes
      );
      parentNode.appendChild(inputNode);

      // Renderiza todos os outputs da receita associada
      recipeForInput.outputs.forEach((output) => {
        const outputQuantity = calculateOutputQuantity(quantity, output.amount);
        const outputNode = createNode(output.product, outputQuantity, recipes);
        parentNode.appendChild(outputNode);
      });

      // Renderiza os inputs dessa receita (exceto 'labour')
      recipeForInput.inputs.forEach((input) => {
        const childQuantity = calculateInputQuantity(
          input.amount,
          quantity,
          recipeForInput.outputs[0].amount
        );
        const childNode = createNode(input.product, childQuantity, recipes);
        parentNode.appendChild(childNode);

        if (input.product !== "labour") {
          renderInputProduction(
            input.product,
            childQuantity,
            recipes,
            childNode
          );
        }
      });
    }
  }

  // Cria um elemento de node
  function createNode(product, amount, recipes) {
    const node = document.createElement("div");
    node.classList.add("node");
    node.innerHTML = `<strong>${product}</strong><br>Quantidade: ${amount}`;

    // Criar um dropdown para receitas
    const recipeSelect = document.createElement("select");
    recipeSelect.classList.add("recipe-select");

    const disabledOption = document.createElement("option");
    disabledOption.value = "";
    disabledOption.text = "Choose a recipe";
    disabledOption.disabled = true;
    disabledOption.selected = true;
    recipeSelect.appendChild(disabledOption);
    

    // Adicionar opções de receitas ao dropdown
    Object.keys(recipes).forEach((key) => {
      if (
        recipes[key].outputs &&
        !recipes[key].bots_only &&
        recipes[key].outputs.filter((o) => o.product == product).length != 0
      ) {
        const option = document.createElement("option");
        option.value = key;
        option.text = recipes[key].name;
        recipeSelect.appendChild(option);
      }
    });

    node.appendChild(recipeSelect);

    // Adicionar evento para atualizar a árvore de produção do node selecionado
    recipeSelect.addEventListener("change", () => {
      const selectedRecipeKey = recipeSelect.value;
      const selectedRecipe = recipes[selectedRecipeKey];
      if (selectedRecipe) {
        // Limpar nodes existentes e gerar nova árvore para a receita selecionada
        const currentNodeGroup = node; // O grupo atual do node
        currentNodeGroup.innerHTML = ""; // Limpar nodes existentes

        // Gerar nova árvore de produção apenas para a receita selecionada
        generateProductionTree(
          selectedRecipe,
          finalProductPercentage.value,
          currentNodeGroup
        );
      }
    });

    return node;
  }

  // Calcula a quantidade correta para o output
  function calculateOutputQuantity(percentage, baseOutputAmount) {
    const factor = percentage;
    return (factor * baseOutputAmount).toFixed(2); // Limita a duas casas decimais
  }

  // Calcula a quantidade correta para os inputs
  function calculateInputQuantity(inputAmount, percentage, baseOutputAmount) {
    const factor = percentage;
    return (factor * inputAmount).toFixed(2); // Limita a duas casas decimais
  }
});
