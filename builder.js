/**
 * Workflow Builder Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('workflow-canvas');
    const placeholder = document.getElementById('canvas-placeholder');
    const yamlPreview = document.querySelector('#yaml-preview code');
    const workflowNameInput = document.getElementById('workflow-name');
    const triggerSelect = document.getElementById('trigger-select');
    const validationPill = document.getElementById('validation-pill');

    const exportBtn = document.getElementById('export-yaml-btn');
    const copyBtn = document.getElementById('copy-yaml');

    // Modals
    const editModal = document.getElementById('edit-modal');
    const saveEditBtn = document.getElementById('save-edit');
    const cancelEditBtn = document.getElementById('cancel-edit');

    let workflowSteps = [];
    let editingStepId = null;

    // --- Drag and Drop Logic ---

    document.querySelectorAll('.draggable-step').forEach(step => {
        step.addEventListener('dragstart', (e) => {
            const data = {
                name: step.getAttribute('data-name'),
                type: step.getAttribute('data-type'),
                uses: step.getAttribute('data-uses') || null,
                run: step.getAttribute('data-run') || null
            };
            e.dataTransfer.setData('application/json', JSON.stringify(data));
        });
    });

    canvas.addEventListener('dragover', (e) => {
        e.preventDefault();
        canvas.classList.add('drag-over');
    });

    canvas.addEventListener('dragleave', () => {
        canvas.classList.remove('drag-over');
    });

    canvas.addEventListener('drop', (e) => {
        e.preventDefault();
        canvas.classList.remove('drag-over');

        try {
            const stepData = JSON.parse(e.dataTransfer.getData('application/json'));
            addStep(stepData);
        } catch (err) {
            console.error('Drop error:', err);
        }
    });

    // --- Workflow Management ---

    function addStep(data) {
        const id = Date.now().toString();
        workflowSteps.push({ id, ...data });
        renderCanvas();
        updateYamlPreview();
    }

    function removeStep(id) {
        workflowSteps = workflowSteps.filter(s => s.id !== id);
        renderCanvas();
        updateYamlPreview();
    }

    function renderCanvas() {
        // Clear children except placeholder
        const existingBlocks = canvas.querySelectorAll('.step-block');
        existingBlocks.forEach(b => b.remove());

        if (workflowSteps.length === 0) {
            placeholder.style.display = 'block';
            return;
        }

        placeholder.style.display = 'none';

        workflowSteps.forEach((step, index) => {
            const block = document.createElement('div');
            block.className = 'step-block';
            block.innerHTML = `
                <div class="step-info">
                    <h5>${step.name}</h5>
                    <p>${step.uses ? step.uses : step.run}</p>
                </div>
                <div class="step-actions">
                    <button class="icon-btn edit" onclick="window.builder.openEdit('${step.id}')">
                        <i class="ri-edit-line"></i>
                    </button>
                    <button class="icon-btn delete" onclick="window.builder.remove('${step.id}')">
                        <i class="ri-delete-bin-line"></i>
                    </button>
                </div>
            `;
            canvas.appendChild(block);
        });
    }

    async function updateYamlPreview() {
        const workflowData = {
            name: workflowNameInput.value,
            on: triggerSelect.value,
            jobs: {
                build: {
                    runsOn: 'ubuntu-latest',
                    steps: workflowSteps.map(s => {
                        const { name, uses, run } = s;
                        return uses ? { name, uses } : { name, run };
                    })
                }
            }
        };

        try {
            const res = await fetch('/api/workflow/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ workflowData })
            });
            const data = await res.json();

            yamlPreview.textContent = data.yaml;

            if (data.validation === "Workflow is valid.") {
                validationPill.className = 'pill valid';
                validationPill.textContent = 'Valid';
            } else {
                validationPill.className = 'pill error';
                validationPill.textContent = 'Warning';
                validationPill.title = data.validation;
            }
        } catch (err) {
            console.error('Preview error:', err);
        }
    }

    // --- Modal Logic ---

    window.builder = {
        remove: (id) => removeStep(id),
        openEdit: (id) => {
            editingStepId = id;
            const step = workflowSteps.find(s => s.id === id);
            document.getElementById('edit-step-name').value = step.name;

            const usesField = document.getElementById('uses-field');
            const runField = document.getElementById('run-field');

            if (step.uses) {
                usesField.style.display = 'block';
                runField.style.display = 'none';
                document.getElementById('edit-step-uses').value = step.uses;
            } else {
                usesField.style.display = 'none';
                runField.style.display = 'block';
                document.getElementById('edit-step-run').value = step.run;
            }

            editModal.classList.remove('hidden');
        }
    };

    saveEditBtn.addEventListener('click', () => {
        const name = document.getElementById('edit-step-name').value;
        const uses = document.getElementById('edit-step-uses').value;
        const run = document.getElementById('edit-step-run').value;

        const idx = workflowSteps.findIndex(s => s.id === editingStepId);
        if (idx !== -1) {
            workflowSteps[idx].name = name;
            if (workflowSteps[idx].uses) workflowSteps[idx].uses = uses;
            else workflowSteps[idx].run = run;
        }

        editModal.classList.add('hidden');
        renderCanvas();
        updateYamlPreview();
    });

    cancelEditBtn.addEventListener('click', () => editModal.classList.add('hidden'));

    // --- Actions ---

    exportBtn.addEventListener('click', () => {
        const yaml = yamlPreview.textContent;
        const blob = new Blob([yaml], { type: 'text/yaml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = workflowNameInput.value || 'main.yml';
        a.click();
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(yamlPreview.textContent);
        copyBtn.innerHTML = '<i class="ri-check-line"></i>';
        setTimeout(() => copyBtn.innerHTML = '<i class="ri-file-copy-line"></i>', 2000);
    });

    workflowNameInput.addEventListener('change', updateYamlPreview);
    triggerSelect.addEventListener('change', updateYamlPreview);
});
