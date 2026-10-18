const provider = document.getElementById('personal-provider');
const model = document.getElementById('personal-model');
provider?.addEventListener('change', () => {
    model.value = provider.selectedOptions[0].dataset.model;
    document.getElementById('personal-key').value = '';
});
