document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('addressModal');
  if (!modal) return;

  const form = document.getElementById('addressForm');
  const modalTitle = document.getElementById('addressModalTitle');
  const submitBtn = document.getElementById('submitAddressBtn');
  const addressIdInput = document.getElementById('addressId');
  const closeBtn = document.getElementById('closeModal');
  const cancelBtn = document.getElementById('cancelBtn');

  // 🔹 ERROR HANDLING FUNCTIONS

  function clearErrors() {
    document.querySelectorAll('.error-msg').forEach(el => {
      el.textContent = '';
      el.classList.add('hidden');
    });
  }

  function showError(inputName, message) {
    const field = form.querySelector(`[name="${inputName}"]`);
    const errorEl = field.parentElement.querySelector('.error-msg');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
  }

  function clearError(inputName) {
    const field = form.querySelector(`[name="${inputName}"]`);
    const errorEl = field.parentElement.querySelector('.error-msg');
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }

  // 🔹 FORM VALIDATION

  function validateForm(data) {
    clearErrors();
    let isValid = true;

    const nameRegex = /^[A-Za-z ]+$/
    const words = data.fullname.trim().split(/\s+/)

    if (!data.fullname.trim()) {
      showError('fullname', 'Full name is required');
      isValid = false;
    }
    else if (!nameRegex.test(data.fullname)) {
      showError('fullname', 'Name can contain only letters and spaces')
      isValid = false
    }
    else if (words.length < 1) {
      showError('fullname', 'Enter at least 3 words')
      isValid = false
    }
    if (!/^[0-9]{10}$/.test(data.mobile)) {
      showError('mobile', 'Enter a valid 10-digit mobile number (numbers only)');
      isValid = false;
    }

    if (!data.address.trim()) {
      showError('address', 'Address is required');
      isValid = false;
    }

    if (!data.district.trim()) {
      showError('district', 'District is required');
      isValid = false;
    }

    if (!data.state.trim()) {
      showError('state', 'State is required');
      isValid = false;
    }

    if (!data.country.trim()) {
      showError('country', 'Country is required');
      isValid = false;
    }

    if (!/^[0-9]{6}$/.test(data.pincode)) {
      showError('pincode', 'Enter a valid 6-digit pincode');
      isValid = false;
    }

    return isValid;
  }

  // 🔹 LIVE VALIDATION (Errors disappear on correct input)

  form.fullname.addEventListener('input', () => {
    const value = form.fullname.value.trim();
    const words = value.split(/\s+/);
    const nameRegex = /^[A-Za-z ]+$/;

    if (!value) {
      showError('fullname', 'Full name is required');
      return;
    }

    if (!nameRegex.test(value)) {
      showError('fullname', 'Name can contain only letters and spaces');
      return;
    }

    if (words.length < 1) {
      showError('fullname', 'Enter at least 3 words');
      return;
    }

    clearError('fullname');
  })


  form.mobile.addEventListener('input', () => {
    form.mobile.value = form.mobile.value.replace(/[^0-9]/g, '');

    if (/^[0-9]{10}$/.test(form.mobile.value.trim())) {
      clearError('mobile');
    }
  })

  form.address.addEventListener('input', () => {
    if (form.address.value.trim().length > 0) clearError('address');
  });

  form.district.addEventListener('input', () => {
    if (form.district.value.trim().length > 0) clearError('district');
  });

  form.state.addEventListener('input', () => {
    if (form.state.value.trim().length > 0) clearError('state');
  });

  form.country.addEventListener('input', () => {
    if (form.country.value.trim().length > 0) clearError('country');
  });

  form.pincode.addEventListener('input', () => {
    if (/^[0-9]{6}$/.test(form.pincode.value.trim())) clearError('pincode');
  });

  // 🔹 OPEN / CLOSE MODAL

  document.querySelectorAll('.add-new-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      modalTitle.textContent = 'Add New Address';
      submitBtn.textContent = 'Save Address';
      addressIdInput.value = '';
      form.reset();
      clearErrors();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  });

  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const card = document.getElementById(`address-${id}`);

      modalTitle.textContent = 'Edit Address';
      submitBtn.textContent = 'Save Changes';
      addressIdInput.value = id;

      form.fullname.value = card.querySelector('input[data-field=\'fullname\']').value;
      form.mobile.value = card.querySelector('input[data-field=\'mobile\']').value;
      form.address.value = card.querySelector('input[data-field=\'address\']').value;
      form.district.value = card.querySelector('input[data-field=\'district\']').value;
      form.state.value = card.querySelector('input[data-field=\'state\']').value;
      form.country.value = card.querySelector('input[data-field=\'country\']').value;
      form.pincode.value = card.querySelector('input[data-field=\'pincode\']').value;

      clearErrors();
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    });
  });

  const closeModal = () => {
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    form.reset();
    clearErrors();
  };

  closeBtn?.addEventListener('click', closeModal);
  cancelBtn?.addEventListener('click', closeModal);

  // 🔹 SUBMIT HANDLER

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      fullname: form.fullname.value.trim(),
      mobile: form.mobile.value.trim(),
      address: form.address.value.trim(),
      district: form.district.value.trim(),
      state: form.state.value.trim(),
      country: form.country.value.trim(),
      pincode: form.pincode.value.trim(),
    };

    const isValid = validateForm(formData);
    if (!isValid) return;

    const id = addressIdInput.value;
    const url = id ? `/profile/address/${id}` : '/profile/address';
    const method = id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        closeModal();

        if (addressIdInput.value) {
          toastr.success('Address updated successfully!');
        } else {
          toastr.success('Address added successfully!');
        }

        const currentPath = window.location.pathname;

        if (currentPath.startsWith('/checkout')) {
          setTimeout(() => {
            window.location.href = `/checkout?selected=${id || 'new'}`;
          }, 800);
        } else {
          setTimeout(() => window.location.reload(), 800);
        }
      }
    } catch (err) {
      alert('Something went wrong. Try again!');
    }
  });

  // 🔹 AUTO-FILL DISTRICT & STATE BASED ON PINCODE
form.pincode.addEventListener('input', async () => {
    const pin = form.pincode.value.trim();

    // Check only when length is exactly 6
    if (/^[0-9]{6}$/.test(pin)) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
        const data = await res.json();

        if (data[0].Status === 'Success') {
          const info = data[0].PostOffice[0];

          form.district.value = info.District || '';
          form.state.value = info.State || '';
          form.country.value = info.Country || 'India';

          clearError('pincode');
          clearError('district');
          clearError('state');
          clearError('country');
        } else {
          showError('pincode', 'Invalid pincode — no location found');
        }
      } catch (error) {
        showError('pincode', 'Unable to fetch location');
      }
    }
  });
});